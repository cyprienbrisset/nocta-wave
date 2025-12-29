import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ReplicaConfig {
  id: string;
  url: string;
  maxConnections: number;
  weight: number;
  region?: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
  latencyMs: number;
}

export interface ReplicaStats {
  id: string;
  totalQueries: number;
  avgLatencyMs: number;
  errorCount: number;
  lastError?: string;
  isHealthy: boolean;
}

export interface QueryRoutingOptions {
  preferReplica?: boolean;
  maxStaleness?: number; // Max replication lag in seconds
  region?: string;
  timeout?: number;
}

// ============================================================================
// READ REPLICA SERVICE
// ============================================================================

@Injectable()
export class ReadReplicaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReadReplicaService.name);
  private readonly replicas = new Map<string, PrismaClient>();
  private readonly replicaConfigs = new Map<string, ReplicaConfig>();
  private readonly replicaStats = new Map<string, ReplicaStats>();
  private primaryClient: PrismaClient;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly enabled: boolean;

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.enabled = this.configService.get<boolean>('READ_REPLICAS_ENABLED', false);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Read replicas are disabled');
      return;
    }

    await this.initializePrimary();
    await this.initializeReplicas();
    this.startHealthChecks();

    this.logger.log(`Read replica service initialized with ${this.replicas.size} replicas`);
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize primary database connection
   */
  private async initializePrimary(): Promise<void> {
    const primaryUrl = this.configService.get<string>('DATABASE_URL');
    if (!primaryUrl) {
      throw new Error('DATABASE_URL is required');
    }

    this.primaryClient = new PrismaClient({
      datasources: {
        db: { url: primaryUrl },
      },
      log: ['error', 'warn'],
    });

    await this.primaryClient.$connect();
    this.logger.log('Primary database connected');
  }

  /**
   * Initialize read replica connections
   */
  private async initializeReplicas(): Promise<void> {
    // Parse replica URLs from config
    // Format: REPLICA_1_URL, REPLICA_2_URL, etc.
    const replicaUrls = this.parseReplicaUrls();

    for (const [id, config] of replicaUrls) {
      try {
        const client = new PrismaClient({
          datasources: {
            db: { url: config.url },
          },
          log: ['error'],
        });

        await client.$connect();

        this.replicas.set(id, client);
        this.replicaConfigs.set(id, {
          ...config,
          isHealthy: true,
          lastHealthCheck: new Date(),
          latencyMs: 0,
        });
        this.replicaStats.set(id, {
          id,
          totalQueries: 0,
          avgLatencyMs: 0,
          errorCount: 0,
          isHealthy: true,
        });

        this.logger.log(`Replica ${id} connected`);
      } catch (error) {
        this.logger.error(`Failed to connect replica ${id}`, error);
      }
    }
  }

  /**
   * Parse replica configuration from environment
   */
  private parseReplicaUrls(): Map<string, Omit<ReplicaConfig, 'isHealthy' | 'lastHealthCheck' | 'latencyMs'>> {
    const configs = new Map<string, Omit<ReplicaConfig, 'isHealthy' | 'lastHealthCheck' | 'latencyMs'>>();

    // Look for REPLICA_1_URL, REPLICA_2_URL, etc.
    for (let i = 1; i <= 10; i++) {
      const url = this.configService.get<string>(`REPLICA_${i}_URL`);
      if (!url) break;

      const weight = this.configService.get<number>(`REPLICA_${i}_WEIGHT`, 1);
      const maxConnections = this.configService.get<number>(`REPLICA_${i}_MAX_CONNECTIONS`, 10);
      const region = this.configService.get<string>(`REPLICA_${i}_REGION`);

      configs.set(`replica-${i}`, {
        id: `replica-${i}`,
        url,
        weight,
        maxConnections,
        region,
      });
    }

    return configs;
  }

  // ============================================================================
  // QUERY ROUTING
  // ============================================================================

  /**
   * Get a client for read queries
   */
  getReadClient(options: QueryRoutingOptions = {}): PrismaClient {
    if (!this.enabled || this.replicas.size === 0) {
      return this.primaryClient;
    }

    // Find healthy replicas
    const healthyReplicas = this.getHealthyReplicas(options);

    if (healthyReplicas.length === 0) {
      this.logger.warn('No healthy replicas available, falling back to primary');
      return this.primaryClient;
    }

    // Select replica based on weighted random selection
    const replica = this.selectReplica(healthyReplicas);

    if (replica) {
      this.incrementQueryCount(replica.id);
      return this.replicas.get(replica.id)!;
    }

    return this.primaryClient;
  }

  /**
   * Get primary client for write queries
   */
  getWriteClient(): PrismaClient {
    return this.primaryClient;
  }

  /**
   * Get healthy replicas matching options
   */
  private getHealthyReplicas(options: QueryRoutingOptions): ReplicaConfig[] {
    const healthy: ReplicaConfig[] = [];

    for (const [, config] of this.replicaConfigs) {
      if (!config.isHealthy) continue;

      // Filter by region if specified
      if (options.region && config.region !== options.region) continue;

      // Check replication lag if maxStaleness specified
      if (options.maxStaleness) {
        const stats = this.replicaStats.get(config.id);
        // For now, we use latency as a proxy for lag
        // In production, you'd query pg_stat_replication
        if (stats && stats.avgLatencyMs > options.maxStaleness * 1000) continue;
      }

      healthy.push(config);
    }

    return healthy;
  }

  /**
   * Select a replica using weighted random selection
   */
  private selectReplica(replicas: ReplicaConfig[]): ReplicaConfig | null {
    if (replicas.length === 0) return null;
    if (replicas.length === 1) return replicas[0];

    const totalWeight = replicas.reduce((sum, r) => sum + r.weight, 0);
    let random = Math.random() * totalWeight;

    for (const replica of replicas) {
      random -= replica.weight;
      if (random <= 0) {
        return replica;
      }
    }

    return replicas[0];
  }

  /**
   * Increment query count for a replica
   */
  private incrementQueryCount(replicaId: string): void {
    const stats = this.replicaStats.get(replicaId);
    if (stats) {
      stats.totalQueries++;
    }
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  /**
   * Start health check loop
   */
  private startHealthChecks(): void {
    const interval = this.configService.get<number>('REPLICA_HEALTH_CHECK_INTERVAL', 10000);

    this.healthCheckInterval = setInterval(async () => {
      await this.runHealthChecks();
    }, interval);

    // Run initial health check
    this.runHealthChecks();
  }

  /**
   * Run health checks on all replicas
   */
  private async runHealthChecks(): Promise<void> {
    for (const [id, client] of this.replicas) {
      try {
        const startTime = Date.now();
        await client.$queryRaw`SELECT 1`;
        const latency = Date.now() - startTime;

        const config = this.replicaConfigs.get(id)!;
        config.isHealthy = true;
        config.lastHealthCheck = new Date();
        config.latencyMs = latency;

        const stats = this.replicaStats.get(id)!;
        stats.isHealthy = true;
        // Update rolling average latency
        stats.avgLatencyMs = (stats.avgLatencyMs * 0.9) + (latency * 0.1);

      } catch (error) {
        const config = this.replicaConfigs.get(id);
        if (config) {
          config.isHealthy = false;
          config.lastHealthCheck = new Date();
        }

        const stats = this.replicaStats.get(id);
        if (stats) {
          stats.isHealthy = false;
          stats.errorCount++;
          stats.lastError = error instanceof Error ? error.message : String(error);
        }

        this.logger.warn(`Replica ${id} health check failed`, error);

        this.eventEmitter.emit('replica.unhealthy', {
          replicaId: id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Check replication lag for a replica
   */
  async getReplicationLag(replicaId: string): Promise<number | null> {
    const client = this.replicas.get(replicaId);
    if (!client) return null;

    try {
      // Query pg_stat_replication on primary
      const result = await this.primaryClient.$queryRaw<{ lag_seconds: number }[]>`
        SELECT
          EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()))::float as lag_seconds
      `;

      // This needs to be run on the replica, not primary
      // For now, return the latency as a proxy
      const config = this.replicaConfigs.get(replicaId);
      return config?.latencyMs ?? null;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // QUERY HELPERS
  // ============================================================================

  /**
   * Execute a read query with automatic routing
   */
  async executeRead<T>(
    query: (client: PrismaClient) => Promise<T>,
    options: QueryRoutingOptions = {},
  ): Promise<T> {
    const client = this.getReadClient(options);
    const replicaId = this.getClientId(client);
    const startTime = Date.now();

    try {
      const result = await Promise.race([
        query(client),
        this.createTimeout(options.timeout || 30000),
      ]) as T;

      // Record latency
      if (replicaId) {
        const latency = Date.now() - startTime;
        this.recordLatency(replicaId, latency);
      }

      return result;

    } catch (error) {
      // Mark replica as unhealthy on error
      if (replicaId) {
        this.markUnhealthy(replicaId, error);
      }

      // Retry on primary if replica failed
      if (replicaId && options.preferReplica !== false) {
        this.logger.warn(`Replica ${replicaId} failed, retrying on primary`);
        return query(this.primaryClient);
      }

      throw error;
    }
  }

  /**
   * Execute a write query on primary
   */
  async executeWrite<T>(query: (client: PrismaClient) => Promise<T>): Promise<T> {
    return query(this.primaryClient);
  }

  /**
   * Get client ID (null for primary)
   */
  private getClientId(client: PrismaClient): string | null {
    for (const [id, c] of this.replicas) {
      if (c === client) return id;
    }
    return null;
  }

  /**
   * Record latency for a replica
   */
  private recordLatency(replicaId: string, latency: number): void {
    const stats = this.replicaStats.get(replicaId);
    if (stats) {
      stats.avgLatencyMs = (stats.avgLatencyMs * 0.9) + (latency * 0.1);
    }
  }

  /**
   * Mark a replica as unhealthy
   */
  private markUnhealthy(replicaId: string, error: unknown): void {
    const config = this.replicaConfigs.get(replicaId);
    if (config) {
      config.isHealthy = false;
    }

    const stats = this.replicaStats.get(replicaId);
    if (stats) {
      stats.isHealthy = false;
      stats.errorCount++;
      stats.lastError = error instanceof Error ? error.message : String(error);
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Query timeout after ${ms}ms`)), ms);
    });
  }

  // ============================================================================
  // METRICS & MONITORING
  // ============================================================================

  /**
   * Get replica statistics
   */
  getReplicaStats(): ReplicaStats[] {
    return [...this.replicaStats.values()];
  }

  /**
   * Get replica configurations
   */
  getReplicaConfigs(): ReplicaConfig[] {
    return [...this.replicaConfigs.values()];
  }

  /**
   * Get service status
   */
  getStatus(): {
    enabled: boolean;
    primaryConnected: boolean;
    replicaCount: number;
    healthyReplicaCount: number;
  } {
    const healthyCount = [...this.replicaConfigs.values()].filter((c) => c.isHealthy).length;

    return {
      enabled: this.enabled,
      primaryConnected: !!this.primaryClient,
      replicaCount: this.replicas.size,
      healthyReplicaCount: healthyCount,
    };
  }

  // ============================================================================
  // SHUTDOWN
  // ============================================================================

  /**
   * Shutdown all connections
   */
  private async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Disconnect replicas
    for (const [id, client] of this.replicas) {
      try {
        await client.$disconnect();
        this.logger.log(`Replica ${id} disconnected`);
      } catch (error) {
        this.logger.error(`Error disconnecting replica ${id}`, error);
      }
    }

    // Disconnect primary
    if (this.primaryClient) {
      await this.primaryClient.$disconnect();
      this.logger.log('Primary database disconnected');
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if replicas are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Force health check on all replicas
   */
  async forceHealthCheck(): Promise<void> {
    await this.runHealthChecks();
  }

  /**
   * Get the best replica for a region
   */
  getBestReplicaForRegion(region: string): string | null {
    const replicas = [...this.replicaConfigs.values()].filter(
      (c) => c.isHealthy && c.region === region,
    );

    if (replicas.length === 0) return null;

    // Return the one with lowest latency
    replicas.sort((a, b) => a.latencyMs - b.latencyMs);
    return replicas[0].id;
  }
}
