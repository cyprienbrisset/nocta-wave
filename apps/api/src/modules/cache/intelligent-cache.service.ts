import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as crypto from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface IdempotentNodeConfig {
  nodeType: string;
  isIdempotent: boolean;
  cacheTTL: number; // seconds
  cacheStrategy: 'input' | 'input-config' | 'full';
  invalidateOn?: string[]; // Events that should invalidate this cache
}

export interface CacheKey {
  workflowId: string;
  nodeId: string;
  nodeType: string;
  inputHash: string;
  configHash?: string;
}

export interface CachedResult<T = unknown> {
  data: T;
  metadata: {
    cachedAt: number;
    expiresAt: number;
    hitCount: number;
    nodeType: string;
    inputHash: string;
    version: number;
  };
}

export interface InvalidationRule {
  id: string;
  pattern: string; // Glob pattern for cache keys
  triggers: InvalidationTrigger[];
  enabled: boolean;
}

export interface InvalidationTrigger {
  type: 'event' | 'schedule' | 'dependency' | 'version';
  config: Record<string, unknown>;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  avgTTL: number;
  byNodeType: Record<string, { hits: number; misses: number; entries: number }>;
}

export interface DistributedLock {
  key: string;
  owner: string;
  expiresAt: number;
}

// ============================================================================
// INTELLIGENT CACHE SERVICE
// ============================================================================

@Injectable()
export class IntelligentCacheService implements OnModuleInit {
  private readonly logger = new Logger(IntelligentCacheService.name);
  private readonly instanceId: string;
  private readonly cachePrefix = 'icache';
  private readonly lockPrefix = 'icache:lock';
  private readonly metricsPrefix = 'icache:metrics';

  // Idempotent node configurations
  private idempotentNodes = new Map<string, IdempotentNodeConfig>();

  // Invalidation rules
  private invalidationRules = new Map<string, InvalidationRule>();

  // Local metrics tracking
  private localMetrics = {
    hits: 0,
    misses: 0,
    byNodeType: new Map<string, { hits: number; misses: number }>(),
  };

  // Configuration
  private readonly defaultTTL: number;
  private readonly maxCacheSize: number;
  private readonly enableDistributedLock: boolean;
  private readonly lockTimeout: number;
  private readonly cacheVersion: number;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.instanceId = `instance-${process.pid}-${Date.now()}`;
    this.defaultTTL = this.configService.get<number>('CACHE_DEFAULT_TTL', 3600);
    this.maxCacheSize = this.configService.get<number>('CACHE_MAX_SIZE', 100000);
    this.enableDistributedLock = this.configService.get<boolean>('CACHE_DISTRIBUTED_LOCK', true);
    this.lockTimeout = this.configService.get<number>('CACHE_LOCK_TIMEOUT', 5000);
    this.cacheVersion = this.configService.get<number>('CACHE_VERSION', 1);

    this.initializeIdempotentNodes();
    this.initializeInvalidationRules();
  }

  async onModuleInit() {
    this.subscribeToInvalidationEvents();
    this.logger.log(`Intelligent cache service initialized (instance: ${this.instanceId})`);
  }

  // ============================================================================
  // IDEMPOTENT NODE CONFIGURATION
  // ============================================================================

  /**
   * Initialize known idempotent node types
   */
  private initializeIdempotentNodes(): void {
    const idempotentConfigs: IdempotentNodeConfig[] = [
      // Transform nodes - pure functions
      {
        nodeType: 'transform.map',
        isIdempotent: true,
        cacheTTL: 3600,
        cacheStrategy: 'input-config',
      },
      {
        nodeType: 'transform.filter',
        isIdempotent: true,
        cacheTTL: 3600,
        cacheStrategy: 'input-config',
      },
      {
        nodeType: 'transform.reduce',
        isIdempotent: true,
        cacheTTL: 3600,
        cacheStrategy: 'input-config',
      },
      {
        nodeType: 'transform.json',
        isIdempotent: true,
        cacheTTL: 7200,
        cacheStrategy: 'input',
      },

      // Code nodes - deterministic
      {
        nodeType: 'code.javascript',
        isIdempotent: true,
        cacheTTL: 1800,
        cacheStrategy: 'full',
        invalidateOn: ['workflow.updated'],
      },

      // Data format nodes
      {
        nodeType: 'format.csv',
        isIdempotent: true,
        cacheTTL: 3600,
        cacheStrategy: 'input-config',
      },
      {
        nodeType: 'format.xml',
        isIdempotent: true,
        cacheTTL: 3600,
        cacheStrategy: 'input-config',
      },

      // Crypto nodes
      {
        nodeType: 'crypto.hash',
        isIdempotent: true,
        cacheTTL: 86400, // 24h - hashes never change
        cacheStrategy: 'input-config',
      },
      {
        nodeType: 'crypto.encode',
        isIdempotent: true,
        cacheTTL: 86400,
        cacheStrategy: 'input-config',
      },

      // HTTP GET (with caching headers consideration)
      {
        nodeType: 'http.request',
        isIdempotent: false, // Default, but can be overridden per-node
        cacheTTL: 300,
        cacheStrategy: 'full',
        invalidateOn: ['credential.updated'],
      },
    ];

    for (const config of idempotentConfigs) {
      this.idempotentNodes.set(config.nodeType, config);
    }

    this.logger.log(`Initialized ${this.idempotentNodes.size} idempotent node configurations`);
  }

  /**
   * Register a custom idempotent node type
   */
  registerIdempotentNode(config: IdempotentNodeConfig): void {
    this.idempotentNodes.set(config.nodeType, config);
    this.logger.log(`Registered idempotent node: ${config.nodeType}`);
  }

  /**
   * Check if a node type is idempotent
   */
  isIdempotent(nodeType: string): boolean {
    const config = this.idempotentNodes.get(nodeType);
    return config?.isIdempotent ?? false;
  }

  /**
   * Get cache configuration for a node type
   */
  getNodeConfig(nodeType: string): IdempotentNodeConfig | null {
    return this.idempotentNodes.get(nodeType) ?? null;
  }

  // ============================================================================
  // CACHE OPERATIONS
  // ============================================================================

  /**
   * Get cached result with intelligent key generation
   */
  async get<T>(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    inputData: unknown,
    nodeConfig?: Record<string, unknown>,
  ): Promise<CachedResult<T> | null> {
    const config = this.idempotentNodes.get(nodeType);
    if (!config?.isIdempotent) {
      return null; // Not cacheable
    }

    const cacheKey = this.buildCacheKey(workflowId, nodeId, nodeType, inputData, nodeConfig, config);
    const key = this.serializeCacheKey(cacheKey);

    const cached = await this.redis.get<CachedResult<T>>(key);

    if (cached) {
      // Validate version
      if (cached.metadata.version !== this.cacheVersion) {
        await this.redis.del(key);
        this.recordMiss(nodeType);
        return null;
      }

      // Update hit count
      cached.metadata.hitCount++;
      await this.redis.set(key, cached, this.getRemainingTTL(cached));

      this.recordHit(nodeType);
      this.logger.debug(`Cache hit for ${nodeType}:${nodeId}`);

      return cached;
    }

    this.recordMiss(nodeType);
    return null;
  }

  /**
   * Set cached result with intelligent TTL
   */
  async set<T>(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    inputData: unknown,
    outputData: T,
    nodeConfig?: Record<string, unknown>,
    options?: { ttl?: number; force?: boolean },
  ): Promise<void> {
    const config = this.idempotentNodes.get(nodeType);

    // Only cache idempotent nodes unless forced
    if (!config?.isIdempotent && !options?.force) {
      return;
    }

    const ttl = options?.ttl ?? config?.cacheTTL ?? this.defaultTTL;
    const cacheKey = this.buildCacheKey(workflowId, nodeId, nodeType, inputData, nodeConfig, config);
    const key = this.serializeCacheKey(cacheKey);

    // Check cache size limit
    const currentSize = await this.getCacheSize();
    if (currentSize >= this.maxCacheSize) {
      await this.evictLRU();
    }

    const now = Date.now();
    const cached: CachedResult<T> = {
      data: outputData,
      metadata: {
        cachedAt: now,
        expiresAt: now + ttl * 1000,
        hitCount: 0,
        nodeType,
        inputHash: cacheKey.inputHash,
        version: this.cacheVersion,
      },
    };

    await this.redis.set(key, cached, ttl);

    // Track in index for efficient invalidation
    await this.addToIndex(workflowId, nodeId, nodeType, key);

    this.logger.debug(`Cached ${nodeType}:${nodeId} (TTL: ${ttl}s)`);
  }

  /**
   * Get or compute pattern with distributed lock
   */
  async getOrCompute<T>(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    inputData: unknown,
    compute: () => Promise<T>,
    nodeConfig?: Record<string, unknown>,
  ): Promise<{ data: T; fromCache: boolean; computeTime?: number }> {
    // Try cache first
    const cached = await this.get<T>(workflowId, nodeId, nodeType, inputData, nodeConfig);
    if (cached) {
      return { data: cached.data, fromCache: true };
    }

    // Use distributed lock to prevent thundering herd
    const config = this.idempotentNodes.get(nodeType);
    const cacheKey = this.buildCacheKey(workflowId, nodeId, nodeType, inputData, nodeConfig, config);
    const lockKey = `${this.lockPrefix}:${this.serializeCacheKey(cacheKey)}`;

    if (this.enableDistributedLock) {
      const lock = await this.acquireLock(lockKey);

      if (!lock) {
        // Another instance is computing, wait and retry cache
        await this.waitForComputation(lockKey);
        const retryCache = await this.get<T>(workflowId, nodeId, nodeType, inputData, nodeConfig);
        if (retryCache) {
          return { data: retryCache.data, fromCache: true };
        }
      }

      try {
        const startTime = Date.now();
        const result = await compute();
        const computeTime = Date.now() - startTime;

        await this.set(workflowId, nodeId, nodeType, inputData, result, nodeConfig);

        return { data: result, fromCache: false, computeTime };
      } finally {
        await this.releaseLock(lockKey);
      }
    } else {
      const startTime = Date.now();
      const result = await compute();
      const computeTime = Date.now() - startTime;

      await this.set(workflowId, nodeId, nodeType, inputData, result, nodeConfig);

      return { data: result, fromCache: false, computeTime };
    }
  }

  // ============================================================================
  // CACHE KEY GENERATION
  // ============================================================================

  /**
   * Build cache key based on node type strategy
   */
  private buildCacheKey(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    inputData: unknown,
    nodeConfig?: Record<string, unknown>,
    config?: IdempotentNodeConfig | null,
  ): CacheKey {
    const strategy = config?.cacheStrategy ?? 'input';
    const inputHash = this.hashData(inputData);

    let configHash: string | undefined;

    switch (strategy) {
      case 'input-config':
        configHash = nodeConfig ? this.hashData(nodeConfig) : undefined;
        break;
      case 'full':
        configHash = this.hashData({ nodeConfig, workflowId, nodeType });
        break;
      case 'input':
      default:
        // Only input hash
        break;
    }

    return {
      workflowId,
      nodeId,
      nodeType,
      inputHash,
      configHash,
    };
  }

  /**
   * Serialize cache key to string
   */
  private serializeCacheKey(key: CacheKey): string {
    const parts = [this.cachePrefix, `v${this.cacheVersion}`, key.workflowId, key.nodeId, key.inputHash];

    if (key.configHash) {
      parts.push(key.configHash);
    }

    return parts.join(':');
  }

  /**
   * Hash data for cache key
   */
  private hashData(data: unknown): string {
    const normalized = JSON.stringify(data, Object.keys((data as object) || {}).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  // ============================================================================
  // INTELLIGENT INVALIDATION
  // ============================================================================

  /**
   * Initialize invalidation rules
   */
  private initializeInvalidationRules(): void {
    const defaultRules: InvalidationRule[] = [
      {
        id: 'workflow-update',
        pattern: 'icache:*:{workflowId}:*',
        triggers: [
          { type: 'event', config: { event: 'workflow.updated' } },
          { type: 'event', config: { event: 'workflow.graph.changed' } },
        ],
        enabled: true,
      },
      {
        id: 'credential-update',
        pattern: 'icache:*:*:*',
        triggers: [
          { type: 'event', config: { event: 'credential.updated' } },
        ],
        enabled: true,
      },
      {
        id: 'version-bump',
        pattern: 'icache:v*:*:*',
        triggers: [
          { type: 'version', config: {} },
        ],
        enabled: true,
      },
    ];

    for (const rule of defaultRules) {
      this.invalidationRules.set(rule.id, rule);
    }
  }

  /**
   * Subscribe to invalidation events
   */
  private subscribeToInvalidationEvents(): void {
    // Workflow events
    this.eventEmitter.on('workflow.updated', async (payload: { workflowId: string }) => {
      await this.invalidateByWorkflow(payload.workflowId);
    });

    this.eventEmitter.on('workflow.graph.changed', async (payload: { workflowId: string }) => {
      await this.invalidateByWorkflow(payload.workflowId);
    });

    // Node events
    this.eventEmitter.on('node.config.changed', async (payload: { workflowId: string; nodeId: string }) => {
      await this.invalidateByNode(payload.workflowId, payload.nodeId);
    });

    // Credential events
    this.eventEmitter.on('credential.updated', async (payload: { credentialId: string; teamId: string }) => {
      await this.invalidateByCredential(payload.credentialId, payload.teamId);
    });

    // Cache version change
    this.eventEmitter.on('cache.version.bump', async () => {
      await this.invalidateAll();
    });

    this.logger.log('Subscribed to invalidation events');
  }

  /**
   * Invalidate cache by workflow
   */
  async invalidateByWorkflow(workflowId: string): Promise<number> {
    const pattern = `${this.cachePrefix}:v${this.cacheVersion}:${workflowId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
      await this.cleanupIndex(workflowId);
    }

    this.logger.log(`Invalidated ${keys.length} cache entries for workflow ${workflowId}`);
    this.eventEmitter.emit('cache.invalidated', { type: 'workflow', workflowId, count: keys.length });

    return keys.length;
  }

  /**
   * Invalidate cache by node
   */
  async invalidateByNode(workflowId: string, nodeId: string): Promise<number> {
    const pattern = `${this.cachePrefix}:v${this.cacheVersion}:${workflowId}:${nodeId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
    }

    this.logger.log(`Invalidated ${keys.length} cache entries for node ${nodeId}`);
    this.eventEmitter.emit('cache.invalidated', { type: 'node', workflowId, nodeId, count: keys.length });

    return keys.length;
  }

  /**
   * Invalidate cache by credential (across all workflows)
   */
  async invalidateByCredential(credentialId: string, teamId: string): Promise<number> {
    // Get all nodes that use this credential from the index
    const indexKey = `${this.cachePrefix}:index:credential:${credentialId}`;
    const affectedKeys = await this.redis.getClient().smembers(indexKey);

    if (affectedKeys.length > 0) {
      await this.redis.delMultiple(...affectedKeys);
    }

    this.logger.log(`Invalidated ${affectedKeys.length} cache entries for credential ${credentialId}`);

    return affectedKeys.length;
  }

  /**
   * Invalidate all cache entries (version bump)
   */
  async invalidateAll(): Promise<number> {
    const pattern = `${this.cachePrefix}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      // Delete in batches to avoid blocking Redis
      const batchSize = 1000;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        await this.redis.delMultiple(...batch);
      }
    }

    this.logger.warn(`Invalidated ALL ${keys.length} cache entries`);

    return keys.length;
  }

  /**
   * Invalidate by pattern
   */
  async invalidateByPattern(pattern: string): Promise<number> {
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
    }

    return keys.length;
  }

  // ============================================================================
  // CACHE INDEX MANAGEMENT
  // ============================================================================

  /**
   * Add cache entry to index for efficient invalidation
   */
  private async addToIndex(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    cacheKey: string,
  ): Promise<void> {
    const client = this.redis.getClient();
    const pipeline = client.pipeline();

    // Index by workflow
    pipeline.sadd(`${this.cachePrefix}:index:workflow:${workflowId}`, cacheKey);

    // Index by node type
    pipeline.sadd(`${this.cachePrefix}:index:type:${nodeType}`, cacheKey);

    // Set TTL on indexes
    pipeline.expire(`${this.cachePrefix}:index:workflow:${workflowId}`, 86400);
    pipeline.expire(`${this.cachePrefix}:index:type:${nodeType}`, 86400);

    await pipeline.exec();
  }

  /**
   * Cleanup index entries for a workflow
   */
  private async cleanupIndex(workflowId: string): Promise<void> {
    const indexKey = `${this.cachePrefix}:index:workflow:${workflowId}`;
    await this.redis.del(indexKey);
  }

  // ============================================================================
  // DISTRIBUTED LOCKING
  // ============================================================================

  /**
   * Acquire distributed lock
   */
  private async acquireLock(key: string): Promise<boolean> {
    const client = this.redis.getClient();
    const result = await client.set(key, this.instanceId, 'PX', this.lockTimeout, 'NX');
    return result === 'OK';
  }

  /**
   * Release distributed lock
   */
  private async releaseLock(key: string): Promise<void> {
    const client = this.redis.getClient();
    const owner = await client.get(key);

    if (owner === this.instanceId) {
      await client.del(key);
    }
  }

  /**
   * Wait for computation to complete (poll lock)
   */
  private async waitForComputation(lockKey: string): Promise<void> {
    const maxWait = this.lockTimeout;
    const pollInterval = 50;
    let waited = 0;

    while (waited < maxWait) {
      const exists = await this.redis.exists(lockKey);
      if (!exists) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      waited += pollInterval;
    }
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  /**
   * Get remaining TTL for a cached entry
   */
  private getRemainingTTL<T>(cached: CachedResult<T>): number {
    const remaining = Math.max(0, cached.metadata.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
  }

  /**
   * Get current cache size
   */
  private async getCacheSize(): Promise<number> {
    const pattern = `${this.cachePrefix}:v${this.cacheVersion}:*`;
    const keys = await this.redis.keys(pattern);
    return keys.length;
  }

  /**
   * Evict least recently used entries
   */
  private async evictLRU(): Promise<void> {
    // Get all cache entries
    const pattern = `${this.cachePrefix}:v${this.cacheVersion}:*`;
    const keys = await this.redis.keys(pattern);

    // Get entries with hit counts
    const entries: { key: string; hitCount: number; cachedAt: number }[] = [];

    for (const key of keys.slice(0, 1000)) {
      // Sample first 1000
      const cached = await this.redis.get<CachedResult>(key);
      if (cached) {
        entries.push({
          key,
          hitCount: cached.metadata.hitCount,
          cachedAt: cached.metadata.cachedAt,
        });
      }
    }

    // Sort by hit count (ascending) and age (oldest first)
    entries.sort((a, b) => {
      if (a.hitCount !== b.hitCount) {
        return a.hitCount - b.hitCount;
      }
      return a.cachedAt - b.cachedAt;
    });

    // Evict bottom 10%
    const toEvict = entries.slice(0, Math.ceil(entries.length * 0.1));
    if (toEvict.length > 0) {
      await this.redis.delMultiple(...toEvict.map((e) => e.key));
      this.logger.log(`Evicted ${toEvict.length} LRU cache entries`);
    }
  }

  /**
   * Scheduled cleanup of expired index entries
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredIndexes(): Promise<void> {
    const indexPattern = `${this.cachePrefix}:index:*`;
    const indexKeys = await this.redis.keys(indexPattern);

    for (const indexKey of indexKeys) {
      const members = await this.redis.getClient().smembers(indexKey);

      // Check which cache entries still exist
      const validMembers: string[] = [];
      for (const member of members) {
        const exists = await this.redis.exists(member);
        if (exists) {
          validMembers.push(member);
        }
      }

      // Update index with only valid members
      if (validMembers.length < members.length) {
        const client = this.redis.getClient();
        await client.del(indexKey);
        if (validMembers.length > 0) {
          await client.sadd(indexKey, ...validMembers);
        }
      }
    }
  }

  // ============================================================================
  // METRICS
  // ============================================================================

  /**
   * Record cache hit
   */
  private recordHit(nodeType: string): void {
    this.localMetrics.hits++;

    const typeMetrics = this.localMetrics.byNodeType.get(nodeType) || { hits: 0, misses: 0 };
    typeMetrics.hits++;
    this.localMetrics.byNodeType.set(nodeType, typeMetrics);
  }

  /**
   * Record cache miss
   */
  private recordMiss(nodeType: string): void {
    this.localMetrics.misses++;

    const typeMetrics = this.localMetrics.byNodeType.get(nodeType) || { hits: 0, misses: 0 };
    typeMetrics.misses++;
    this.localMetrics.byNodeType.set(nodeType, typeMetrics);
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const cacheSize = await this.getCacheSize();
    const memoryInfo = await this.redis.getClient().info('memory');
    const memoryUsed = parseInt(memoryInfo.match(/used_memory:(\d+)/)?.[1] || '0', 10);

    const total = this.localMetrics.hits + this.localMetrics.misses;
    const hitRate = total > 0 ? this.localMetrics.hits / total : 0;

    const byNodeType: Record<string, { hits: number; misses: number; entries: number }> = {};
    for (const [nodeType, metrics] of this.localMetrics.byNodeType) {
      byNodeType[nodeType] = {
        ...metrics,
        entries: 0, // Would need to count from index
      };
    }

    return {
      hits: this.localMetrics.hits,
      misses: this.localMetrics.misses,
      hitRate,
      totalEntries: cacheSize,
      memoryUsage: memoryUsed,
      avgTTL: this.defaultTTL,
      byNodeType,
    };
  }

  /**
   * Sync local metrics to Redis (for multi-instance aggregation)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async syncMetrics(): Promise<void> {
    const client = this.redis.getClient();

    await client.hincrby(`${this.metricsPrefix}:global`, 'hits', this.localMetrics.hits);
    await client.hincrby(`${this.metricsPrefix}:global`, 'misses', this.localMetrics.misses);

    // Reset local counters after sync
    this.localMetrics.hits = 0;
    this.localMetrics.misses = 0;
  }

  /**
   * Get aggregated metrics from all instances
   */
  async getAggregatedMetrics(): Promise<{ hits: number; misses: number; hitRate: number }> {
    const client = this.redis.getClient();
    const metrics = await client.hgetall(`${this.metricsPrefix}:global`);

    const hits = parseInt(metrics.hits || '0', 10);
    const misses = parseInt(metrics.misses || '0', 10);
    const total = hits + misses;

    return {
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all registered idempotent node types
   */
  getIdempotentNodeTypes(): string[] {
    return [...this.idempotentNodes.keys()].filter(
      (type) => this.idempotentNodes.get(type)?.isIdempotent,
    );
  }

  /**
   * Get all invalidation rules
   */
  getInvalidationRules(): InvalidationRule[] {
    return [...this.invalidationRules.values()];
  }

  /**
   * Warm cache for a workflow (precompute common results)
   */
  async warmCache(workflowId: string, nodeResults: Map<string, { nodeType: string; input: unknown; output: unknown }>): Promise<number> {
    let warmed = 0;

    for (const [nodeId, result] of nodeResults) {
      const config = this.idempotentNodes.get(result.nodeType);
      if (config?.isIdempotent) {
        await this.set(workflowId, nodeId, result.nodeType, result.input, result.output);
        warmed++;
      }
    }

    this.logger.log(`Warmed ${warmed} cache entries for workflow ${workflowId}`);
    return warmed;
  }
}
