import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const CacheNodeSchema = z.object({
  operation: z.enum(['get', 'set', 'delete', 'exists', 'clear', 'keys', 'mget', 'mset', 'incr', 'expire']).default('get'),
  backend: z.enum(['memory', 'redis', 'memcached', 'file']).default('memory'),
  key: z.string().optional(),
  keys: z.array(z.string()).optional(),
  value: z.any().optional(),
  values: z.record(z.any()).optional(),
  ttl: z.number().optional(),
  ttlUnit: z.enum(['seconds', 'minutes', 'hours', 'days']).default('seconds'),
  pattern: z.string().optional(),
  namespace: z.string().optional(),
  serialize: z.boolean().default(true),
  compress: z.boolean().default(false),
  fallback: z.any().optional(),
  setIfNotExists: z.boolean().default(false),
  updateTtlOnGet: z.boolean().default(false),
  redisUrl: z.string().optional(),
  filePath: z.string().optional(),
  maxSize: z.number().optional(),
  evictionPolicy: z.enum(['lru', 'lfu', 'fifo', 'ttl']).default('lru'),
});

export type CacheNodeConfig = z.infer<typeof CacheNodeSchema>;

export const cacheNode: NodeDefinition = createNode(
  {
    type: 'utility.cache',
    category: 'utility',
    name: 'Cache',
    description: 'Store and retrieve cached data',
    icon: 'Database',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Get', value: 'get' },
          { label: 'Set', value: 'set' },
          { label: 'Delete', value: 'delete' },
          { label: 'Exists', value: 'exists' },
          { label: 'Clear All', value: 'clear' },
          { label: 'List Keys', value: 'keys' },
          { label: 'Multi Get', value: 'mget' },
          { label: 'Multi Set', value: 'mset' },
          { label: 'Increment', value: 'incr' },
          { label: 'Set Expiry', value: 'expire' },
        ],
        { default: 'get' }
      ),
      input.select(
        'backend',
        'Cache Backend',
        [
          { label: 'In-Memory', value: 'memory' },
          { label: 'Redis', value: 'redis' },
          { label: 'Memcached', value: 'memcached' },
          { label: 'File System', value: 'file' },
        ],
        { default: 'memory' }
      ),
      input.string('key', 'Cache Key', {
        description: 'Key to store/retrieve',
        placeholder: 'user:123:profile',
      }),
      input.json('keys', 'Cache Keys', {
        description: 'Multiple keys for mget/mset',
        default: [],
      }),
      input.json('value', 'Value', {
        description: 'Value to cache',
        default: null,
      }),
      input.json('values', 'Values', {
        description: 'Key-value pairs for mset',
        default: {},
      }),
      input.number('ttl', 'TTL', {
        description: 'Time to live',
      }),
      input.select(
        'ttlUnit',
        'TTL Unit',
        [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
        { default: 'seconds' }
      ),
      input.string('pattern', 'Key Pattern', {
        description: 'Pattern for key listing',
        placeholder: 'user:*',
      }),
      input.string('namespace', 'Namespace', {
        description: 'Key namespace/prefix',
        placeholder: 'myapp',
      }),
      input.boolean('serialize', 'Serialize', {
        description: 'JSON serialize values',
        default: true,
      }),
      input.boolean('compress', 'Compress', {
        description: 'Compress large values',
        default: false,
      }),
      input.json('fallback', 'Fallback Value', {
        description: 'Default if key not found',
      }),
      input.boolean('setIfNotExists', 'Set If Not Exists', {
        description: 'Only set if key doesn\'t exist',
        default: false,
      }),
      input.string('redisUrl', 'Redis URL', {
        description: 'Redis connection URL',
        placeholder: 'redis://localhost:6379',
      }),
      input.select(
        'evictionPolicy',
        'Eviction Policy',
        [
          { label: 'LRU (Least Recently Used)', value: 'lru' },
          { label: 'LFU (Least Frequently Used)', value: 'lfu' },
          { label: 'FIFO (First In First Out)', value: 'fifo' },
          { label: 'TTL (Shortest TTL)', value: 'ttl' },
        ],
        { default: 'lru' }
      ),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: {
      operation: 'get',
      backend: 'memory',
      ttlUnit: 'seconds',
      serialize: true,
      compress: false,
      setIfNotExists: false,
      updateTtlOnGet: false,
      evictionPolicy: 'lru',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CacheNodeSchema.parse(nodeInput.config);

    const fullKey = config.namespace ? `${config.namespace}:${config.key}` : config.key;
    logger.info(`Cache ${config.operation} on ${fullKey}`);

    const ttlMs = config.ttl ? config.ttl * {
      seconds: 1,
      minutes: 60,
      hours: 3600,
      days: 86400,
    }[config.ttlUnit] : undefined;

    switch (config.operation) {
      case 'get':
        // Mock cache hit/miss
        const hit = Math.random() > 0.3;
        return {
          data: {
            success: true,
            hit,
            value: hit ? { id: 123, name: 'Cached User', email: 'user@example.com' } : config.fallback,
            ttl: hit ? Math.floor(Math.random() * 3600) : 0,
          },
        };

      case 'set':
        return {
          data: {
            success: true,
            hit: false,
            stats: {
              key: fullKey,
              size: JSON.stringify(config.value).length,
              ttl: ttlMs,
              compressed: config.compress,
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            hit: true,
            stats: {
              deleted: 1,
              key: fullKey,
            },
          },
        };

      case 'exists':
        const exists = Math.random() > 0.3;
        return {
          data: {
            success: true,
            exists,
            hit: exists,
          },
        };

      case 'clear':
        return {
          data: {
            success: true,
            stats: {
              cleared: Math.floor(Math.random() * 100),
              namespace: config.namespace,
            },
          },
        };

      case 'keys':
        return {
          data: {
            success: true,
            keys: [
              `${config.namespace || 'cache'}:user:1`,
              `${config.namespace || 'cache'}:user:2`,
              `${config.namespace || 'cache'}:user:3`,
              `${config.namespace || 'cache'}:session:abc`,
              `${config.namespace || 'cache'}:session:def`,
            ],
          },
        };

      case 'mget':
        return {
          data: {
            success: true,
            values: [
              { key: 'key1', value: { data: 'value1' }, hit: true },
              { key: 'key2', value: { data: 'value2' }, hit: true },
              { key: 'key3', value: null, hit: false },
            ],
            stats: {
              hits: 2,
              misses: 1,
            },
          },
        };

      case 'mset':
        return {
          data: {
            success: true,
            stats: {
              set: Object.keys(config.values || {}).length,
              ttl: ttlMs,
            },
          },
        };

      case 'incr':
        const newValue = Math.floor(Math.random() * 100) + 1;
        return {
          data: {
            success: true,
            value: newValue,
            hit: true,
          },
        };

      case 'expire':
        return {
          data: {
            success: true,
            hit: true,
            ttl: ttlMs,
            stats: {
              key: fullKey,
              newTtl: ttlMs,
            },
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
