import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import * as crypto from 'crypto';

interface CacheOptions {
  ttlSeconds?: number;
  nodeType?: string;
}

interface CacheEntry {
  outputData: unknown;
  nodeType: string;
  cachedAt: string;
  expiresAt: string;
}

export interface CacheStats {
  total: number;
  byNode: Record<string, { count: number }>;
}

/**
 * NodeCacheService - Redis-only cache for node execution results
 *
 * PERFORMANCE OPTIMIZATION:
 * This service was migrated from a hybrid PostgreSQL + Redis approach
 * to Redis-only storage for the following reasons:
 *
 * 1. Cache data is ephemeral with TTL - no need for persistent storage
 * 2. Redis provides native TTL expiration (no cleanup jobs needed)
 * 3. Eliminates expensive PostgreSQL I/O for high-frequency operations
 * 4. Sub-millisecond access times vs database round-trips
 *
 * Redis key pattern: node-cache:{workflowId}:{nodeId}:{inputHash}
 */
@Injectable()
export class NodeCacheService {
  private readonly logger = new Logger(NodeCacheService.name);
  private readonly defaultTTL = 3600; // 1 hour
  private readonly cachePrefix = 'node-cache';

  constructor(private redis: RedisService) {}

  /**
   * Generate a hash from input data for cache key
   */
  private generateInputHash(input: unknown): string {
    const normalized = JSON.stringify(input, Object.keys((input as object) || {}).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Build Redis key for cache entry
   */
  private buildKey(workflowId: string, nodeId: string, inputHash: string): string {
    return `${this.cachePrefix}:${workflowId}:${nodeId}:${inputHash}`;
  }

  /**
   * Get cached result for a node
   */
  async get(
    workflowId: string,
    nodeId: string,
    inputData: unknown,
  ): Promise<{ outputData: unknown; cachedAt: Date; expiresAt: Date } | null> {
    const inputHash = this.generateInputHash(inputData);
    const key = this.buildKey(workflowId, nodeId, inputHash);

    const cached = await this.redis.get<CacheEntry>(key);

    if (cached) {
      this.logger.debug(`Cache hit for node ${nodeId}`);
      return {
        outputData: cached.outputData,
        cachedAt: new Date(cached.cachedAt),
        expiresAt: new Date(cached.expiresAt),
      };
    }

    return null;
  }

  /**
   * Set cached result for a node
   */
  async set(
    workflowId: string,
    nodeId: string,
    inputData: unknown,
    outputData: unknown,
    options?: CacheOptions,
  ): Promise<void> {
    const inputHash = this.generateInputHash(inputData);
    const ttlSeconds = options?.ttlSeconds || this.defaultTTL;
    const key = this.buildKey(workflowId, nodeId, inputHash);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

    const cacheEntry: CacheEntry = {
      outputData,
      nodeType: options?.nodeType || 'unknown',
      cachedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await this.redis.set(key, cacheEntry, ttlSeconds);

    this.logger.debug(`Cached result for node ${nodeId} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Invalidate cache for a specific node
   */
  async invalidateNode(workflowId: string, nodeId: string): Promise<number> {
    const pattern = `${this.cachePrefix}:${workflowId}:${nodeId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
      this.logger.log(`Invalidated ${keys.length} cache entries for node ${nodeId}`);
    }

    return keys.length;
  }

  /**
   * Invalidate all cache for a workflow
   */
  async invalidateWorkflow(workflowId: string): Promise<number> {
    const pattern = `${this.cachePrefix}:${workflowId}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
      this.logger.log(`Invalidated ${keys.length} cache entries for workflow ${workflowId}`);
    }

    return keys.length;
  }

  /**
   * Get cache statistics for a workflow
   * Note: This scans Redis keys, use sparingly in production
   */
  async getStats(workflowId: string): Promise<CacheStats> {
    const pattern = `${this.cachePrefix}:${workflowId}:*`;
    const keys = await this.redis.keys(pattern);

    // Parse keys to group by node
    const byNode: Record<string, { count: number }> = {};

    for (const key of keys) {
      // Key format: node-cache:{workflowId}:{nodeId}:{inputHash}
      const parts = key.split(':');
      if (parts.length >= 3) {
        const nodeId = parts[2];
        if (!byNode[nodeId]) {
          byNode[nodeId] = { count: 0 };
        }
        byNode[nodeId].count++;
      }
    }

    return {
      total: keys.length,
      byNode,
    };
  }

  /**
   * Cleanup is now handled automatically by Redis TTL
   * This method is kept for backwards compatibility but does nothing
   */
  async cleanup(): Promise<number> {
    this.logger.debug('Cleanup not needed - Redis TTL handles expiration automatically');
    return 0;
  }

  /**
   * Get or compute - helper for caching pattern
   */
  async getOrCompute<T>(
    workflowId: string,
    nodeId: string,
    inputData: unknown,
    compute: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<{ data: T; fromCache: boolean }> {
    // Try cache first
    const cached = await this.get(workflowId, nodeId, inputData);
    if (cached) {
      return { data: cached.outputData as T, fromCache: true };
    }

    // Compute and cache
    const result = await compute();
    await this.set(workflowId, nodeId, inputData, result, options);

    return { data: result, fromCache: false };
  }

  /**
   * Check if a cached result exists without retrieving it
   */
  async has(workflowId: string, nodeId: string, inputData: unknown): Promise<boolean> {
    const inputHash = this.generateInputHash(inputData);
    const key = this.buildKey(workflowId, nodeId, inputHash);
    return this.redis.exists(key);
  }

  /**
   * Get remaining TTL for a cached entry
   */
  async getTTL(workflowId: string, nodeId: string, inputData: unknown): Promise<number> {
    const inputHash = this.generateInputHash(inputData);
    const key = this.buildKey(workflowId, nodeId, inputHash);
    const client = this.redis.getClient();
    return client.ttl(key);
  }
}
