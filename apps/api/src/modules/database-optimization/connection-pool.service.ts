import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PoolConfig {
  minConnections: number;
  maxConnections: number;
  acquireTimeout: number;
  idleTimeout: number;
  maxLifetime: number;
  statementTimeout: number;
  connectionTimeout: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  acquireCount: number;
  acquireSuccessCount: number;
  acquireFailCount: number;
  avgAcquireTime: number;
  maxAcquireTime: number;
}

export interface ConnectionInfo {
  id: string;
  state: 'active' | 'idle' | 'connecting' | 'closing';
  createdAt: Date;
  lastUsedAt: Date;
  queryCount: number;
  currentQuery?: string;
  pid?: number;
}

export interface PoolHealthStatus {
  healthy: boolean;
  utilizationPercent: number;
  availableConnections: number;
  warnings: string[];
}

// ============================================================================
// CONNECTION POOL SERVICE
// ============================================================================

/**
 * Connection Pool Service
 *
 * This service provides connection pooling configuration and monitoring
 * for PgBouncer or application-level pooling. It works alongside
 * the database module to optimize connection usage.
 *
 * When using PgBouncer:
 * - Configure PgBouncer with the settings from getRecommendedPgBouncerConfig()
 * - The DATABASE_URL should point to PgBouncer, not directly to PostgreSQL
 *
 * When using application-level pooling (Prisma's built-in):
 * - Configure connection_limit in the DATABASE_URL query string
 * - Use this service to monitor and optimize pool usage
 */
@Injectable()
export class ConnectionPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ConnectionPoolService.name);
  private readonly config: PoolConfig;
  private readonly usePgBouncer: boolean;

  // Metrics tracking
  private acquireTimes: number[] = [];
  private readonly maxSamples = 1000;
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    acquireCount: 0,
    acquireSuccessCount: 0,
    acquireFailCount: 0,
    avgAcquireTime: 0,
    maxAcquireTime: 0,
  };

  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.usePgBouncer = this.configService.get<boolean>('USE_PGBOUNCER', false);

    this.config = {
      minConnections: this.configService.get<number>('POOL_MIN_CONNECTIONS', 2),
      maxConnections: this.configService.get<number>('POOL_MAX_CONNECTIONS', 20),
      acquireTimeout: this.configService.get<number>('POOL_ACQUIRE_TIMEOUT', 30000),
      idleTimeout: this.configService.get<number>('POOL_IDLE_TIMEOUT', 10000),
      maxLifetime: this.configService.get<number>('POOL_MAX_LIFETIME', 1800000), // 30 min
      statementTimeout: this.configService.get<number>('POOL_STATEMENT_TIMEOUT', 30000),
      connectionTimeout: this.configService.get<number>('POOL_CONNECTION_TIMEOUT', 5000),
    };
  }

  async onModuleInit() {
    this.startMetricsCollection();
    this.logger.log(`Connection pool service initialized (PgBouncer: ${this.usePgBouncer})`);
  }

  async onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get current pool configuration
   */
  getConfig(): PoolConfig {
    return { ...this.config };
  }

  /**
   * Get recommended PgBouncer configuration
   */
  getRecommendedPgBouncerConfig(): Record<string, string | number> {
    const cpuCores = require('os').cpus().length;

    return {
      // Pool settings
      pool_mode: 'transaction', // Best for web applications
      max_client_conn: this.config.maxConnections * 10, // Allow many client connections
      default_pool_size: Math.max(cpuCores * 2, this.config.maxConnections),
      min_pool_size: this.config.minConnections,
      reserve_pool_size: Math.ceil(this.config.maxConnections * 0.1),
      reserve_pool_timeout: 3,

      // Timeouts
      server_connect_timeout: Math.ceil(this.config.connectionTimeout / 1000),
      server_idle_timeout: Math.ceil(this.config.idleTimeout / 1000),
      server_lifetime: Math.ceil(this.config.maxLifetime / 1000),
      client_idle_timeout: 300,
      query_timeout: Math.ceil(this.config.statementTimeout / 1000),

      // Authentication
      auth_type: 'md5',
      auth_file: '/etc/pgbouncer/userlist.txt',

      // Logging
      log_connections: 1,
      log_disconnections: 1,
      log_pooler_errors: 1,
      stats_period: 60,

      // Performance
      tcp_keepalive: 1,
      tcp_keepidle: 60,
      tcp_keepintvl: 10,
      tcp_keepcnt: 6,
      tcp_user_timeout: 0,

      // Security
      ignore_startup_parameters: 'extra_float_digits',
    };
  }

  /**
   * Generate PgBouncer INI configuration file content
   */
  generatePgBouncerIniConfig(
    databases: { name: string; host: string; port: number; dbname: string }[],
  ): string {
    const config = this.getRecommendedPgBouncerConfig();

    let ini = '[databases]\n';
    for (const db of databases) {
      ini += `${db.name} = host=${db.host} port=${db.port} dbname=${db.dbname}\n`;
    }

    ini += '\n[pgbouncer]\n';
    for (const [key, value] of Object.entries(config)) {
      ini += `${key} = ${value}\n`;
    }

    return ini;
  }

  /**
   * Get Prisma connection string with pool settings
   */
  getPrismaConnectionString(baseUrl: string): string {
    const url = new URL(baseUrl);

    // Add connection pool parameters
    url.searchParams.set('connection_limit', String(this.config.maxConnections));
    url.searchParams.set('pool_timeout', String(this.config.acquireTimeout / 1000));
    url.searchParams.set('connect_timeout', String(this.config.connectionTimeout / 1000));
    url.searchParams.set('statement_cache_size', '100');

    return url.toString();
  }

  // ============================================================================
  // METRICS COLLECTION
  // ============================================================================

  /**
   * Start collecting pool metrics
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.collectMetrics();
    }, 5000); // Every 5 seconds
  }

  /**
   * Collect current pool metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // If using PgBouncer, query its stats
      if (this.usePgBouncer) {
        await this.collectPgBouncerMetrics();
      } else {
        // Use PostgreSQL's pg_stat_activity for application-level metrics
        await this.collectPgStatMetrics();
      }

      // Emit metrics event
      this.eventEmitter.emit('pool.metrics', this.stats);

      // Check health and emit warnings if needed
      const health = this.getHealthStatus();
      if (!health.healthy) {
        this.eventEmitter.emit('pool.unhealthy', health);
      }

    } catch (error) {
      this.logger.debug('Failed to collect pool metrics', error);
    }
  }

  /**
   * Collect metrics from PgBouncer SHOW STATS
   */
  private async collectPgBouncerMetrics(): Promise<void> {
    // This would require a connection to PgBouncer admin database
    // For now, we use estimation based on configuration
    const estimated = this.estimatePoolStats();
    Object.assign(this.stats, estimated);
  }

  /**
   * Collect metrics from PostgreSQL pg_stat_activity
   */
  private async collectPgStatMetrics(): Promise<void> {
    // This would be called with PrismaService in real implementation
    // For now, we use estimation
    const estimated = this.estimatePoolStats();
    Object.assign(this.stats, estimated);
  }

  /**
   * Estimate pool stats based on tracking
   */
  private estimatePoolStats(): Partial<PoolStats> {
    return {
      avgAcquireTime: this.calculateAvgAcquireTime(),
      maxAcquireTime: Math.max(...this.acquireTimes, 0),
    };
  }

  /**
   * Calculate average acquire time
   */
  private calculateAvgAcquireTime(): number {
    if (this.acquireTimes.length === 0) return 0;
    const sum = this.acquireTimes.reduce((a, b) => a + b, 0);
    return sum / this.acquireTimes.length;
  }

  // ============================================================================
  // HEALTH MONITORING
  // ============================================================================

  /**
   * Get pool health status
   */
  getHealthStatus(): PoolHealthStatus {
    const warnings: string[] = [];
    let healthy = true;

    const utilizationPercent = (this.stats.activeConnections / this.config.maxConnections) * 100;

    // Check utilization
    if (utilizationPercent > 90) {
      warnings.push(`High pool utilization: ${utilizationPercent.toFixed(1)}%`);
      healthy = false;
    } else if (utilizationPercent > 75) {
      warnings.push(`Elevated pool utilization: ${utilizationPercent.toFixed(1)}%`);
    }

    // Check waiting requests
    if (this.stats.waitingRequests > 0) {
      warnings.push(`${this.stats.waitingRequests} requests waiting for connections`);
      if (this.stats.waitingRequests > 10) {
        healthy = false;
      }
    }

    // Check acquire failures
    const failRate = this.stats.acquireCount > 0
      ? (this.stats.acquireFailCount / this.stats.acquireCount) * 100
      : 0;

    if (failRate > 5) {
      warnings.push(`High connection acquire failure rate: ${failRate.toFixed(1)}%`);
      healthy = false;
    }

    // Check acquire time
    if (this.stats.avgAcquireTime > 1000) {
      warnings.push(`Slow connection acquire time: ${this.stats.avgAcquireTime.toFixed(0)}ms`);
    }

    return {
      healthy,
      utilizationPercent,
      availableConnections: this.config.maxConnections - this.stats.activeConnections,
      warnings,
    };
  }

  /**
   * Scheduled health check
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck(): Promise<void> {
    const health = this.getHealthStatus();

    if (!health.healthy) {
      this.logger.warn('Connection pool health check failed', { warnings: health.warnings });

      this.eventEmitter.emit('pool.health.warning', {
        ...health,
        timestamp: new Date(),
      });
    }
  }

  // ============================================================================
  // CONNECTION TRACKING
  // ============================================================================

  /**
   * Record a connection acquire attempt
   */
  recordAcquire(durationMs: number, success: boolean): void {
    this.stats.acquireCount++;

    if (success) {
      this.stats.acquireSuccessCount++;

      if (this.acquireTimes.length >= this.maxSamples) {
        this.acquireTimes.shift();
      }
      this.acquireTimes.push(durationMs);
    } else {
      this.stats.acquireFailCount++;
    }
  }

  /**
   * Update active connection count
   */
  updateConnectionCount(active: number, idle: number): void {
    this.stats.activeConnections = active;
    this.stats.idleConnections = idle;
    this.stats.totalConnections = active + idle;
  }

  /**
   * Update waiting request count
   */
  updateWaitingCount(count: number): void {
    this.stats.waitingRequests = count;
  }

  // ============================================================================
  // OPTIMIZATION RECOMMENDATIONS
  // ============================================================================

  /**
   * Get pool optimization recommendations
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const health = this.getHealthStatus();

    // Pool size recommendations
    if (health.utilizationPercent > 80) {
      const suggestedMax = Math.ceil(this.config.maxConnections * 1.5);
      recommendations.push(
        `Consider increasing max_connections to ${suggestedMax} (current: ${this.config.maxConnections})`,
      );
    } else if (health.utilizationPercent < 20 && this.config.maxConnections > 10) {
      const suggestedMax = Math.max(10, Math.ceil(this.config.maxConnections * 0.7));
      recommendations.push(
        `Consider decreasing max_connections to ${suggestedMax} to reduce resource usage`,
      );
    }

    // Acquire time recommendations
    if (this.stats.avgAcquireTime > 500) {
      recommendations.push('Consider using PgBouncer for better connection pooling');
      recommendations.push('Review slow queries that may be holding connections');
    }

    // PgBouncer recommendations
    if (!this.usePgBouncer && this.stats.acquireFailCount > 0) {
      recommendations.push(
        'PgBouncer can help manage connection limits more efficiently',
      );
    }

    // Idle timeout recommendations
    if (this.stats.idleConnections > this.stats.activeConnections * 2) {
      recommendations.push(
        `Consider reducing idle_timeout (current: ${this.config.idleTimeout}ms)`,
      );
    }

    return recommendations;
  }

  /**
   * Calculate optimal pool size based on workload
   */
  calculateOptimalPoolSize(): {
    minConnections: number;
    maxConnections: number;
    reasoning: string;
  } {
    const cpuCores = require('os').cpus().length;

    // PostgreSQL connection formula: connections = (core_count * 2) + effective_spindle_count
    // For SSD, effective_spindle_count is typically 1
    const baseConnections = cpuCores * 2 + 1;

    // Adjust based on observed usage
    let multiplier = 1;
    const health = this.getHealthStatus();

    if (health.utilizationPercent > 70) {
      multiplier = 1.5;
    } else if (health.utilizationPercent < 30) {
      multiplier = 0.8;
    }

    const maxConnections = Math.ceil(baseConnections * multiplier);
    const minConnections = Math.max(2, Math.ceil(maxConnections * 0.2));

    return {
      minConnections,
      maxConnections,
      reasoning: `Based on ${cpuCores} CPU cores and ${health.utilizationPercent.toFixed(0)}% current utilization`,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * Check if PgBouncer is enabled
   */
  isPgBouncerEnabled(): boolean {
    return this.usePgBouncer;
  }

  /**
   * Get connection info for debugging
   */
  async getConnectionInfo(): Promise<ConnectionInfo[]> {
    // In real implementation, this would query pg_stat_activity
    // For now, return empty array
    return [];
  }

  /**
   * Force connection pool refresh
   */
  async refreshPool(): Promise<void> {
    this.logger.log('Refreshing connection pool...');

    // Reset statistics
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      acquireCount: 0,
      acquireSuccessCount: 0,
      acquireFailCount: 0,
      avgAcquireTime: 0,
      maxAcquireTime: 0,
    };

    this.acquireTimes = [];

    this.eventEmitter.emit('pool.refreshed', { timestamp: new Date() });
  }
}
