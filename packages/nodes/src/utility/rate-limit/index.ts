import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const RateLimitNodeSchema = z.object({
  operation: z.enum(['check', 'consume', 'reset', 'status', 'wait']).default('check'),
  algorithm: z.enum(['fixedWindow', 'slidingWindow', 'tokenBucket', 'leakyBucket']).default('tokenBucket'),
  key: z.string().optional(),
  keyExpression: z.string().optional(),
  limit: z.number().min(1).default(100),
  window: z.number().min(1).default(60),
  windowUnit: z.enum(['seconds', 'minutes', 'hours', 'days']).default('seconds'),
  tokens: z.number().optional(),
  refillRate: z.number().optional(),
  refillInterval: z.number().optional(),
  bucketSize: z.number().optional(),
  burstLimit: z.number().optional(),
  blockDuration: z.number().optional(),
  skipFailed: z.boolean().default(false),
  strategy: z.enum(['reject', 'queue', 'delay']).default('reject'),
  storage: z.enum(['memory', 'redis', 'custom']).default('memory'),
  redisUrl: z.string().optional(),
  prefix: z.string().default('ratelimit'),
});

export type RateLimitNodeConfig = z.infer<typeof RateLimitNodeSchema>;

export const rateLimitNode: NodeDefinition = createNode(
  {
    type: 'utility.rate-limit',
    category: 'utility',
    name: 'Rate Limit',
    description: 'Control execution rate and throttling',
    icon: 'Gauge',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Check Limit', value: 'check' },
          { label: 'Consume Token', value: 'consume' },
          { label: 'Reset Counter', value: 'reset' },
          { label: 'Get Status', value: 'status' },
          { label: 'Wait if Limited', value: 'wait' },
        ],
        { default: 'check' }
      ),
      input.select(
        'algorithm',
        'Algorithm',
        [
          { label: 'Fixed Window', value: 'fixedWindow' },
          { label: 'Sliding Window', value: 'slidingWindow' },
          { label: 'Token Bucket', value: 'tokenBucket' },
          { label: 'Leaky Bucket', value: 'leakyBucket' },
        ],
        { default: 'tokenBucket' }
      ),
      input.string('key', 'Rate Limit Key', {
        description: 'Unique identifier for rate limiting',
        placeholder: 'user:123',
      }),
      input.string('keyExpression', 'Key Expression', {
        description: 'Dynamic key from input data',
        placeholder: '{{$input.userId}}',
      }),
      input.number('limit', 'Request Limit', {
        description: 'Maximum requests allowed',
        default: 100,
        min: 1,
      }),
      input.number('window', 'Time Window', {
        description: 'Time window duration',
        default: 60,
        min: 1,
      }),
      input.select(
        'windowUnit',
        'Window Unit',
        [
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
          { label: 'Hours', value: 'hours' },
          { label: 'Days', value: 'days' },
        ],
        { default: 'seconds' }
      ),
      input.number('tokens', 'Tokens to Consume', {
        description: 'Number of tokens to consume',
        default: 1,
      }),
      input.number('refillRate', 'Refill Rate', {
        description: 'Tokens added per interval',
      }),
      input.number('refillInterval', 'Refill Interval', {
        description: 'Interval between refills (ms)',
      }),
      input.number('bucketSize', 'Bucket Size', {
        description: 'Maximum bucket capacity',
      }),
      input.number('burstLimit', 'Burst Limit', {
        description: 'Allow burst above limit',
      }),
      input.number('blockDuration', 'Block Duration', {
        description: 'Block duration after limit (seconds)',
      }),
      input.select(
        'strategy',
        'Limit Strategy',
        [
          { label: 'Reject Request', value: 'reject' },
          { label: 'Queue Request', value: 'queue' },
          { label: 'Delay Request', value: 'delay' },
        ],
        { default: 'reject' }
      ),
      input.select(
        'storage',
        'Storage Backend',
        [
          { label: 'In-Memory', value: 'memory' },
          { label: 'Redis', value: 'redis' },
          { label: 'Custom', value: 'custom' },
        ],
        { default: 'memory' }
      ),
      input.string('redisUrl', 'Redis URL', {
        description: 'Redis connection URL',
        placeholder: 'redis://localhost:6379',
      }),
      input.string('prefix', 'Key Prefix', {
        description: 'Prefix for rate limit keys',
        default: 'ratelimit',
      }),
    ],
    outputs: [
      output.boolean('allowed', 'Request allowed'),
      output.boolean('limited', 'Is rate limited'),
      output.number('remaining', 'Remaining requests'),
      output.number('limit', 'Total limit'),
      output.number('reset', 'Reset timestamp'),
      output.number('retryAfter', 'Retry after (seconds)'),
      output.object('headers', 'Rate limit headers'),
      output.object('status', 'Full status info'),
    ],
    defaults: {
      operation: 'check',
      algorithm: 'tokenBucket',
      limit: 100,
      window: 60,
      windowUnit: 'seconds',
      skipFailed: false,
      strategy: 'reject',
      storage: 'memory',
      prefix: 'ratelimit',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = RateLimitNodeSchema.parse(nodeInput.config);

    logger.info(`Rate Limit ${config.operation} using ${config.algorithm}`);

    const now = Date.now();
    const windowMs = config.window * {
      seconds: 1000,
      minutes: 60000,
      hours: 3600000,
      days: 86400000,
    }[config.windowUnit];
    const resetTime = Math.ceil((now + windowMs) / 1000);

    // Mock rate limit state
    const mockRemaining = Math.max(0, config.limit - Math.floor(Math.random() * 20));
    const isLimited = mockRemaining === 0;

    switch (config.operation) {
      case 'check':
        return {
          data: {
            allowed: !isLimited,
            limited: isLimited,
            remaining: mockRemaining,
            limit: config.limit,
            reset: resetTime,
            retryAfter: isLimited ? Math.ceil(windowMs / 1000) : 0,
            headers: {
              'X-RateLimit-Limit': String(config.limit),
              'X-RateLimit-Remaining': String(mockRemaining),
              'X-RateLimit-Reset': String(resetTime),
              'Retry-After': isLimited ? String(Math.ceil(windowMs / 1000)) : undefined,
            },
          },
        };

      case 'consume':
        const tokensToConsume = config.tokens || 1;
        const newRemaining = Math.max(0, mockRemaining - tokensToConsume);
        const consumeLimited = newRemaining === 0;

        return {
          data: {
            allowed: mockRemaining >= tokensToConsume,
            limited: consumeLimited,
            remaining: newRemaining,
            limit: config.limit,
            reset: resetTime,
            retryAfter: consumeLimited ? Math.ceil(windowMs / 1000) : 0,
            status: {
              consumed: tokensToConsume,
              previousRemaining: mockRemaining,
              newRemaining,
            },
          },
        };

      case 'reset':
        return {
          data: {
            allowed: true,
            limited: false,
            remaining: config.limit,
            limit: config.limit,
            reset: resetTime,
            retryAfter: 0,
            status: {
              reset: true,
              key: config.key || 'default',
            },
          },
        };

      case 'status':
        return {
          data: {
            allowed: !isLimited,
            limited: isLimited,
            remaining: mockRemaining,
            limit: config.limit,
            reset: resetTime,
            retryAfter: isLimited ? Math.ceil(windowMs / 1000) : 0,
            status: {
              key: config.key || 'default',
              algorithm: config.algorithm,
              windowMs,
              bucketSize: config.bucketSize || config.limit,
              currentTokens: mockRemaining,
              lastRefill: now - Math.floor(Math.random() * windowMs),
            },
          },
        };

      case 'wait':
        return {
          data: {
            allowed: true,
            limited: false,
            remaining: mockRemaining,
            limit: config.limit,
            reset: resetTime,
            retryAfter: 0,
            status: {
              waited: isLimited,
              waitTime: isLimited ? Math.floor(Math.random() * 5000) : 0,
            },
          },
        };

      default:
        return { data: { allowed: true, limited: false } };
    }
  }
);
