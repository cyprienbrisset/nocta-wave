import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';

// ============================================================================
// INTERFACES
// ============================================================================

export interface CacheClusterNode {
  id: string;
  host: string;
  port: number;
  role: 'master' | 'replica';
  status: 'online' | 'offline' | 'syncing';
  latencyMs: number;
  lastSeen: number;
}

export interface ConsistentHashConfig {
  virtualNodes: number;
  replicationFactor: number;
}

export interface CacheEntry<T = unknown> {
  data: T;
  metadata: {
    createdAt: number;
    expiresAt: number;
    version: number;
    sourceInstance: string;
  };
}

export interface SyncEvent {
  type: 'set' | 'delete' | 'invalidate';
  key: string;
  data?: unknown;
  ttl?: number;
  timestamp: number;
  sourceInstance: string;
}

export interface DistributedCacheStats {
  localEntries: number;
  remoteEntries: number;
  syncEvents: number;
  syncLag: number;
  clusterNodes: number;
  healthyNodes: number;
}

// ============================================================================
// DISTRIBUTED CACHE SERVICE
// ============================================================================

@Injectable()
export class DistributedCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DistributedCacheService.name);
  private readonly instanceId: string;
  private readonly cachePrefix = 'dcache';
  private readonly syncChannel = 'dcache:sync';

  // Local in-memory cache (L1)
  private localCache = new Map<string, CacheEntry>();
  private localCacheMaxSize: number;
  private localCacheTTL: number;

  // Redis pub/sub for sync
  private subscriber: Redis | null = null;
  private syncBuffer: SyncEvent[] = [];
  private syncInterval: NodeJS.Timeout | null = null;

  // Cluster management
  private clusterNodes = new Map<string, CacheClusterNode>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly enabled: boolean;
  private readonly writeThrough: boolean;
  private readonly readThrough: boolean;
  private readonly syncBatchSize: number;
  private readonly syncIntervalMs: number;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.instanceId = `dcache-${process.pid}-${Date.now()}`;
    this.enabled = this.configService.get<boolean>('DISTRIBUTED_CACHE_ENABLED', true);
    this.writeThrough = this.configService.get<boolean>('CACHE_WRITE_THROUGH', true);
    this.readThrough = this.configService.get<boolean>('CACHE_READ_THROUGH', true);
    this.localCacheMaxSize = this.configService.get<number>('LOCAL_CACHE_MAX_SIZE', 10000);
    this.localCacheTTL = this.configService.get<number>('LOCAL_CACHE_TTL', 60); // seconds
    this.syncBatchSize = this.configService.get<number>('CACHE_SYNC_BATCH_SIZE', 100);
    this.syncIntervalMs = this.configService.get<number>('CACHE_SYNC_INTERVAL', 100);
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Distributed cache is disabled');
      return;
    }

    await this.initializeSubscriber();
    this.startHeartbeat();
    this.startSyncLoop();

    this.logger.log(`Distributed cache initialized (instance: ${this.instanceId})`);
  }

  async onModuleDestroy() {
    await this.shutdown();
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  /**
   * Get value from cache (L1 -> L2)
   */
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.buildKey(key);

    // Check L1 (local)
    const localEntry = this.getFromLocal<T>(fullKey);
    if (localEntry !== null) {
      return localEntry;
    }

    // Check L2 (Redis) if read-through enabled
    if (this.readThrough) {
      const remoteEntry = await this.getFromRemote<T>(fullKey);
      if (remoteEntry !== null) {
        // Populate L1
        this.setLocal(fullKey, remoteEntry, this.localCacheTTL);
        return remoteEntry;
      }
    }

    return null;
  }

  /**
   * Set value in cache (L1 + L2)
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const fullKey = this.buildKey(key);
    const ttl = ttlSeconds ?? this.localCacheTTL;

    // Always set in L1
    this.setLocal(fullKey, value, ttl);

    // Write to L2 if write-through enabled
    if (this.writeThrough) {
      await this.setRemote(fullKey, value, ttl);

      // Broadcast sync event
      this.queueSyncEvent({
        type: 'set',
        key: fullKey,
        data: value,
        ttl,
        timestamp: Date.now(),
        sourceInstance: this.instanceId,
      });
    }
  }

  /**
   * Delete from cache (L1 + L2)
   */
  async delete(key: string): Promise<void> {
    const fullKey = this.buildKey(key);

    // Delete from L1
    this.localCache.delete(fullKey);

    // Delete from L2
    await this.redis.del(fullKey);

    // Broadcast sync event
    this.queueSyncEvent({
      type: 'delete',
      key: fullKey,
      timestamp: Date.now(),
      sourceInstance: this.instanceId,
    });
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const fullKey = this.buildKey(key);

    // Check L1 first
    if (this.localCache.has(fullKey)) {
      const entry = this.localCache.get(fullKey)!;
      if (entry.metadata.expiresAt > Date.now()) {
        return true;
      }
      this.localCache.delete(fullKey);
    }

    // Check L2
    return this.redis.exists(fullKey);
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    const results = new Map<string, T | null>();
    const missingKeys: string[] = [];

    // Check L1 first
    for (const key of keys) {
      const fullKey = this.buildKey(key);
      const local = this.getFromLocal<T>(fullKey);
      if (local !== null) {
        results.set(key, local);
      } else {
        missingKeys.push(key);
      }
    }

    // Fetch missing from L2
    if (this.readThrough && missingKeys.length > 0) {
      const client = this.redis.getClient();
      const remoteValues = await client.mget(...missingKeys.map((k) => this.buildKey(k)));

      for (let i = 0; i < missingKeys.length; i++) {
        const key = missingKeys[i];
        const value = remoteValues[i];

        if (value) {
          try {
            const parsed = JSON.parse(value) as CacheEntry<T>;
            if (parsed.metadata.expiresAt > Date.now()) {
              results.set(key, parsed.data);
              // Populate L1
              this.setLocal(this.buildKey(key), parsed.data, this.localCacheTTL);
            } else {
              results.set(key, null);
            }
          } catch {
            results.set(key, null);
          }
        } else {
          results.set(key, null);
        }
      }
    }

    return results;
  }

  /**
   * Set multiple values
   */
  async mset<T>(entries: Map<string, T>, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.localCacheTTL;

    for (const [key, value] of entries) {
      await this.set(key, value, ttl);
    }
  }

  // ============================================================================
  // LOCAL CACHE (L1)
  // ============================================================================

  /**
   * Get from local cache
   */
  private getFromLocal<T>(key: string): T | null {
    const entry = this.localCache.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.metadata.expiresAt < Date.now()) {
      this.localCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set in local cache
   */
  private setLocal<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict if full
    if (this.localCache.size >= this.localCacheMaxSize) {
      this.evictLocalLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      metadata: {
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
        version: 1,
        sourceInstance: this.instanceId,
      },
    };

    this.localCache.set(key, entry);
  }

  /**
   * Evict oldest entries from local cache
   */
  private evictLocalLRU(): void {
    // Simple FIFO eviction - evict 10% of entries
    const toEvict = Math.ceil(this.localCacheMaxSize * 0.1);
    const keys = [...this.localCache.keys()].slice(0, toEvict);

    for (const key of keys) {
      this.localCache.delete(key);
    }
  }

  // ============================================================================
  // REMOTE CACHE (L2 - REDIS)
  // ============================================================================

  /**
   * Get from remote cache
   */
  private async getFromRemote<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get<CacheEntry<T>>(key);

    if (!raw) {
      return null;
    }

    // Check expiration
    if (raw.metadata.expiresAt < Date.now()) {
      await this.redis.del(key);
      return null;
    }

    return raw.data;
  }

  /**
   * Set in remote cache
   */
  private async setRemote<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data: value,
      metadata: {
        createdAt: now,
        expiresAt: now + ttlSeconds * 1000,
        version: 1,
        sourceInstance: this.instanceId,
      },
    };

    await this.redis.set(key, entry, ttlSeconds);
  }

  // ============================================================================
  // CACHE SYNCHRONIZATION
  // ============================================================================

  /**
   * Initialize pub/sub subscriber for cache sync
   */
  private async initializeSubscriber(): Promise<void> {
    try {
      this.subscriber = this.redis.createSubscriber();

      await this.subscriber.subscribe(this.syncChannel);

      this.subscriber.on('message', async (channel: string, message: string) => {
        if (channel === this.syncChannel) {
          await this.handleSyncEvent(message);
        }
      });

      this.logger.log('Cache sync subscriber initialized');
    } catch (error) {
      this.logger.error('Failed to initialize cache sync subscriber', error);
    }
  }

  /**
   * Handle incoming sync event from another instance
   */
  private async handleSyncEvent(message: string): Promise<void> {
    try {
      const event: SyncEvent = JSON.parse(message);

      // Ignore our own events
      if (event.sourceInstance === this.instanceId) {
        return;
      }

      switch (event.type) {
        case 'set':
          if (event.data !== undefined && event.ttl !== undefined) {
            this.setLocal(event.key, event.data, event.ttl);
          }
          break;

        case 'delete':
        case 'invalidate':
          this.localCache.delete(event.key);
          break;
      }

      this.logger.debug(`Processed sync event: ${event.type} for ${event.key}`);
    } catch (error) {
      this.logger.error('Failed to process sync event', error);
    }
  }

  /**
   * Queue sync event for batch publishing
   */
  private queueSyncEvent(event: SyncEvent): void {
    this.syncBuffer.push(event);
  }

  /**
   * Start sync loop for batch publishing
   */
  private startSyncLoop(): void {
    this.syncInterval = setInterval(async () => {
      if (this.syncBuffer.length === 0) {
        return;
      }

      const batch = this.syncBuffer.splice(0, this.syncBatchSize);

      for (const event of batch) {
        try {
          await this.redis.publish(this.syncChannel, event);
        } catch (error) {
          this.logger.error('Failed to publish sync event', error);
        }
      }
    }, this.syncIntervalMs);
  }

  /**
   * Force sync all instances
   */
  async forceSync(): Promise<void> {
    // Publish invalidate-all event
    const event: SyncEvent = {
      type: 'invalidate',
      key: '*',
      timestamp: Date.now(),
      sourceInstance: this.instanceId,
    };

    await this.redis.publish(this.syncChannel, event);
    this.localCache.clear();

    this.logger.log('Forced cache sync across all instances');
  }

  // ============================================================================
  // CLUSTER MANAGEMENT
  // ============================================================================

  /**
   * Start heartbeat for cluster awareness
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      await this.sendHeartbeat();
      await this.checkClusterHealth();
    }, 10000); // Every 10 seconds

    // Send initial heartbeat
    this.sendHeartbeat();
  }

  /**
   * Send heartbeat to cluster
   */
  private async sendHeartbeat(): Promise<void> {
    const node: CacheClusterNode = {
      id: this.instanceId,
      host: process.env.HOSTNAME || 'localhost',
      port: parseInt(process.env.PORT || '4001', 10),
      role: 'master', // All instances are masters in this setup
      status: 'online',
      latencyMs: 0,
      lastSeen: Date.now(),
    };

    await this.redis.set(`${this.cachePrefix}:cluster:${this.instanceId}`, node, 30);
  }

  /**
   * Check cluster health
   */
  private async checkClusterHealth(): Promise<void> {
    const keys = await this.redis.keys(`${this.cachePrefix}:cluster:*`);
    const now = Date.now();

    this.clusterNodes.clear();

    for (const key of keys) {
      const node = await this.redis.get<CacheClusterNode>(key);
      if (node && now - node.lastSeen < 30000) {
        this.clusterNodes.set(node.id, node);
      }
    }
  }

  /**
   * Get cluster nodes
   */
  getClusterNodes(): CacheClusterNode[] {
    return [...this.clusterNodes.values()];
  }

  // ============================================================================
  // CACHE PATTERNS
  // ============================================================================

  /**
   * Cache-aside pattern
   */
  async cacheAside<T>(
    key: string,
    loader: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // Try cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Load from source
    const value = await loader();

    // Cache the result
    await this.set(key, value, ttlSeconds);

    return value;
  }

  /**
   * Read-through pattern (already implemented via get)
   */

  /**
   * Write-through pattern (already implemented via set)
   */

  /**
   * Write-behind pattern
   */
  async writeBehind<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    // Set in L1 immediately
    this.setLocal(this.buildKey(key), value, ttlSeconds ?? this.localCacheTTL);

    // Queue for async write to L2
    this.queueSyncEvent({
      type: 'set',
      key: this.buildKey(key),
      data: value,
      ttl: ttlSeconds ?? this.localCacheTTL,
      timestamp: Date.now(),
      sourceInstance: this.instanceId,
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Build cache key with prefix
   */
  private buildKey(key: string): string {
    return `${this.cachePrefix}:${key}`;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<DistributedCacheStats> {
    const remotePattern = `${this.cachePrefix}:*`;
    const remoteKeys = await this.redis.keys(remotePattern);

    return {
      localEntries: this.localCache.size,
      remoteEntries: remoteKeys.length,
      syncEvents: this.syncBuffer.length,
      syncLag: 0, // Would need to track this
      clusterNodes: this.clusterNodes.size,
      healthyNodes: [...this.clusterNodes.values()].filter((n) => n.status === 'online').length,
    };
  }

  /**
   * Clear local cache
   */
  clearLocal(): void {
    this.localCache.clear();
  }

  /**
   * Clear all cache (local + remote)
   */
  async clearAll(): Promise<void> {
    this.localCache.clear();

    const pattern = `${this.cachePrefix}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
    }

    // Notify other instances
    await this.forceSync();
  }

  // ============================================================================
  // SHUTDOWN
  // ============================================================================

  /**
   * Graceful shutdown
   */
  private async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Process remaining sync buffer
    while (this.syncBuffer.length > 0) {
      const batch = this.syncBuffer.splice(0, this.syncBatchSize);
      for (const event of batch) {
        try {
          await this.redis.publish(this.syncChannel, event);
        } catch {
          // Ignore errors during shutdown
        }
      }
    }

    if (this.subscriber) {
      await this.subscriber.quit();
    }

    // Remove from cluster
    await this.redis.del(`${this.cachePrefix}:cluster:${this.instanceId}`);

    this.logger.log('Distributed cache shut down');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Check if distributed cache is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.instanceId;
  }
}
