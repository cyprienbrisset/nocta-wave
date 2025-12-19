import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  maxConnections: number;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private queryCount = 0;
  private slowQueryThreshold = 1000; // ms

  constructor(private configService?: ConfigService) {
    // Connection pool configuration via DATABASE_URL params or env
    // Example: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30
    const connectionLimit = parseInt(process.env.DB_POOL_SIZE || '20', 10);
    const poolTimeout = parseInt(process.env.DB_POOL_TIMEOUT || '30', 10);

    super({
      log:
        process.env.NODE_ENV === 'development'
          ? [
              { emit: 'event', level: 'query' },
              { emit: 'stdout', level: 'info' },
              { emit: 'stdout', level: 'warn' },
              { emit: 'stdout', level: 'error' },
            ]
          : [{ emit: 'stdout', level: 'error' }],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log slow queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: Prisma.QueryEvent) => {
        this.queryCount++;
        if (e.duration > this.slowQueryThreshold) {
          this.logger.warn(
            `Slow query (${e.duration}ms): ${e.query.substring(0, 100)}...`,
          );
        }
      });
    }

    this.logger.log(
      `Prisma initialized with pool size: ${connectionLimit}, timeout: ${poolTimeout}s`,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Database connection established');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Get connection pool statistics (approximation)
   */
  async getPoolStats(): Promise<PoolStats> {
    // Prisma doesn't expose pool stats directly, but we can query pg_stat_activity
    try {
      const result = await this.$queryRaw<Array<{ count: bigint; state: string }>>`
        SELECT state, count(*) as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `;

      const stats: PoolStats = {
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        maxConnections: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      };

      result.forEach((row) => {
        const count = Number(row.count);
        if (row.state === 'active') {
          stats.activeConnections = count;
        } else if (row.state === 'idle') {
          stats.idleConnections = count;
        }
      });

      return stats;
    } catch (error) {
      this.logger.error('Failed to get pool stats', error);
      return {
        activeConnections: 0,
        idleConnections: 0,
        waitingRequests: 0,
        maxConnections: parseInt(process.env.DB_POOL_SIZE || '20', 10),
      };
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    return {
      totalQueries: this.queryCount,
      slowQueryThreshold: this.slowQueryThreshold,
    };
  }

  /**
   * Reset query count
   */
  resetQueryStats() {
    this.queryCount = 0;
  }

  /**
   * Execute with retry on connection errors
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if it's a connection error
        const isConnectionError =
          error.code === 'P2024' || // Connection pool timeout
          error.code === 'P2025' || // Record not found (stale)
          error.message?.includes('Connection') ||
          error.message?.includes('ECONNREFUSED');

        if (!isConnectionError || attempt === maxRetries) {
          throw error;
        }

        this.logger.warn(
          `Database operation failed (attempt ${attempt}/${maxRetries}): ${error.message}`,
        );

        // Wait before retry with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, attempt - 1)),
        );
      }
    }

    throw lastError;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Clean database (for testing)
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('cleanDatabase can only be used in test environment');
    }

    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations')
      .map((name) => `"public"."${name}"`)
      .join(', ');

    try {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
    } catch (error) {
      console.log({ error });
    }
  }
}
