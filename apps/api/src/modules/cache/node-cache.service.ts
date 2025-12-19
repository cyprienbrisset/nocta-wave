import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import * as crypto from 'crypto';

interface CacheOptions {
  ttlSeconds?: number;
  useRedis?: boolean;
  nodeType?: string;
}

interface CacheEntry {
  outputData: any;
  cachedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class NodeCacheService {
  private readonly logger = new Logger(NodeCacheService.name);
  private readonly defaultTTL = 3600; // 1 hour

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Generate a hash from input data for cache key
   */
  private generateInputHash(input: any): string {
    const normalized = JSON.stringify(input, Object.keys(input || {}).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get cached result for a node
   */
  async get(
    workflowId: string,
    nodeId: string,
    inputData: any,
    options?: CacheOptions,
  ): Promise<CacheEntry | null> {
    const inputHash = this.generateInputHash(inputData);

    // Try Redis first for faster access
    if (options?.useRedis !== false) {
      const redisKey = `node-cache:${workflowId}:${nodeId}:${inputHash}`;
      const cached = await this.redis.get<CacheEntry>(redisKey);
      if (cached) {
        this.logger.debug(`Cache hit (Redis) for node ${nodeId}`);
        return cached;
      }
    }

    // Fall back to database
    const dbCache = await this.prisma.nodeResultCache.findFirst({
      where: {
        workflowId,
        nodeId,
        inputHash,
        expiresAt: { gt: new Date() },
      },
    });

    if (dbCache) {
      // Increment hit count
      await this.prisma.nodeResultCache.update({
        where: { id: dbCache.id },
        data: { hitCount: { increment: 1 } },
      });

      this.logger.debug(`Cache hit (DB) for node ${nodeId}`);

      return {
        outputData: dbCache.outputData,
        cachedAt: dbCache.createdAt,
        expiresAt: dbCache.expiresAt,
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
    inputData: any,
    outputData: any,
    options?: CacheOptions,
  ): Promise<void> {
    const inputHash = this.generateInputHash(inputData);
    const ttlSeconds = options?.ttlSeconds || this.defaultTTL;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    // Store in Redis for fast access
    if (options?.useRedis !== false) {
      const redisKey = `node-cache:${workflowId}:${nodeId}:${inputHash}`;
      const cacheEntry: CacheEntry = {
        outputData,
        cachedAt: new Date(),
        expiresAt,
      };
      await this.redis.setex(redisKey, ttlSeconds, JSON.stringify(cacheEntry));
    }

    // Store in database for persistence
    await this.prisma.nodeResultCache.upsert({
      where: {
        workflowId_nodeId_inputHash: {
          workflowId,
          nodeId,
          inputHash,
        },
      },
      create: {
        workflowId,
        nodeId,
        nodeType: options?.nodeType || 'unknown',
        inputHash,
        outputData: outputData as any,
        ttlSeconds,
        expiresAt,
      },
      update: {
        outputData: outputData as any,
        ttlSeconds,
        expiresAt,
        hitCount: 0,
      },
    });

    this.logger.debug(`Cached result for node ${nodeId} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * Invalidate cache for a specific node
   */
  async invalidateNode(workflowId: string, nodeId: string): Promise<number> {
    // Clear from Redis
    const pattern = `node-cache:${workflowId}:${nodeId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
    }

    // Clear from database
    const result = await this.prisma.nodeResultCache.deleteMany({
      where: { workflowId, nodeId },
    });

    this.logger.log(`Invalidated ${result.count} cache entries for node ${nodeId}`);
    return result.count;
  }

  /**
   * Invalidate all cache for a workflow
   */
  async invalidateWorkflow(workflowId: string): Promise<number> {
    // Clear from Redis
    const pattern = `node-cache:${workflowId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.delMultiple(...keys);
    }

    // Clear from database
    const result = await this.prisma.nodeResultCache.deleteMany({
      where: { workflowId },
    });

    this.logger.log(`Invalidated ${result.count} cache entries for workflow ${workflowId}`);
    return result.count;
  }

  /**
   * Get cache statistics for a workflow
   */
  async getStats(workflowId: string) {
    const entries = await this.prisma.nodeResultCache.findMany({
      where: { workflowId },
      select: {
        nodeId: true,
        hitCount: true,
        ttlSeconds: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const now = new Date();
    const active = entries.filter((e) => e.expiresAt > now);
    const expired = entries.filter((e) => e.expiresAt <= now);
    const totalHits = entries.reduce((sum, e) => sum + e.hitCount, 0);

    // Group by node
    const byNode = entries.reduce(
      (acc, e) => {
        if (!acc[e.nodeId]) {
          acc[e.nodeId] = { count: 0, hits: 0 };
        }
        acc[e.nodeId].count++;
        acc[e.nodeId].hits += e.hitCount;
        return acc;
      },
      {} as Record<string, { count: number; hits: number }>,
    );

    return {
      total: entries.length,
      active: active.length,
      expired: expired.length,
      totalHits,
      byNode,
    };
  }

  /**
   * Cleanup expired cache entries
   */
  async cleanup(): Promise<number> {
    const result = await this.prisma.nodeResultCache.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired cache entries`);
    return result.count;
  }

  /**
   * Get or compute - helper for caching pattern
   */
  async getOrCompute<T>(
    workflowId: string,
    nodeId: string,
    inputData: any,
    compute: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<{ data: T; fromCache: boolean }> {
    // Try cache first
    const cached = await this.get(workflowId, nodeId, inputData, options);
    if (cached) {
      return { data: cached.outputData as T, fromCache: true };
    }

    // Compute and cache
    const result = await compute();
    await this.set(workflowId, nodeId, inputData, result, options);

    return { data: result, fromCache: false };
  }
}
