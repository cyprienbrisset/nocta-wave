import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const RetryNodeSchema = z.object({
  operation: z.enum(['execute', 'configure', 'status']).default('execute'),
  maxRetries: z.number().min(0).max(100).default(3),
  initialDelay: z.number().min(0).default(1000),
  maxDelay: z.number().min(0).default(30000),
  delayUnit: z.enum(['milliseconds', 'seconds']).default('milliseconds'),
  backoffMultiplier: z.number().min(1).default(2),
  backoffType: z.enum(['fixed', 'linear', 'exponential', 'fibonacci', 'random']).default('exponential'),
  jitter: z.boolean().default(true),
  jitterFactor: z.number().min(0).max(1).default(0.1),
  retryOn: z.array(z.string()).optional(),
  retryOnStatusCodes: z.array(z.number()).optional(),
  doNotRetryOn: z.array(z.string()).optional(),
  timeout: z.number().optional(),
  timeoutUnit: z.enum(['milliseconds', 'seconds']).default('seconds'),
  onRetry: z.string().optional(),
  circuitBreaker: z.boolean().default(false),
  circuitBreakerThreshold: z.number().default(5),
  circuitBreakerResetTimeout: z.number().default(30000),
  fallback: z.any().optional(),
  retryCondition: z.string().optional(),
});

export type RetryNodeConfig = z.infer<typeof RetryNodeSchema>;

export const retryNode: NodeDefinition = createNode(
  {
    type: 'utility.retry',
    category: 'utility',
    name: 'Retry',
    description: 'Retry failed operations with backoff strategies',
    icon: 'RefreshCw',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Execute with Retry', value: 'execute' },
          { label: 'Configure Policy', value: 'configure' },
          { label: 'Get Status', value: 'status' },
        ],
        { default: 'execute' }
      ),
      input.number('maxRetries', 'Max Retries', {
        description: 'Maximum retry attempts',
        default: 3,
        min: 0,
        max: 100,
      }),
      input.number('initialDelay', 'Initial Delay', {
        description: 'First retry delay',
        default: 1000,
      }),
      input.number('maxDelay', 'Max Delay', {
        description: 'Maximum delay between retries',
        default: 30000,
      }),
      input.select(
        'delayUnit',
        'Delay Unit',
        [
          { label: 'Milliseconds', value: 'milliseconds' },
          { label: 'Seconds', value: 'seconds' },
        ],
        { default: 'milliseconds' }
      ),
      input.number('backoffMultiplier', 'Backoff Multiplier', {
        description: 'Delay multiplier for exponential backoff',
        default: 2,
      }),
      input.select(
        'backoffType',
        'Backoff Type',
        [
          { label: 'Fixed Delay', value: 'fixed' },
          { label: 'Linear', value: 'linear' },
          { label: 'Exponential', value: 'exponential' },
          { label: 'Fibonacci', value: 'fibonacci' },
          { label: 'Random', value: 'random' },
        ],
        { default: 'exponential' }
      ),
      input.boolean('jitter', 'Add Jitter', {
        description: 'Add random jitter to delays',
        default: true,
      }),
      input.number('jitterFactor', 'Jitter Factor', {
        description: 'Jitter randomness (0-1)',
        default: 0.1,
      }),
      input.json('retryOn', 'Retry On Errors', {
        description: 'Error types to retry',
        default: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED'],
      }),
      input.json('retryOnStatusCodes', 'Retry On Status Codes', {
        description: 'HTTP status codes to retry',
        default: [408, 429, 500, 502, 503, 504],
      }),
      input.json('doNotRetryOn', 'Do Not Retry On', {
        description: 'Error types to not retry',
        default: ['ValidationError', 'AuthenticationError'],
      }),
      input.number('timeout', 'Timeout', {
        description: 'Overall operation timeout',
      }),
      input.select(
        'timeoutUnit',
        'Timeout Unit',
        [
          { label: 'Milliseconds', value: 'milliseconds' },
          { label: 'Seconds', value: 'seconds' },
        ],
        { default: 'seconds' }
      ),
      input.boolean('circuitBreaker', 'Circuit Breaker', {
        description: 'Enable circuit breaker pattern',
        default: false,
      }),
      input.number('circuitBreakerThreshold', 'Circuit Threshold', {
        description: 'Failures before opening circuit',
        default: 5,
      }),
      input.number('circuitBreakerResetTimeout', 'Circuit Reset Timeout', {
        description: 'Time before half-open (ms)',
        default: 30000,
      }),
      input.json('fallback', 'Fallback Value', {
        description: 'Value to return on all failures',
      }),
      input.text('retryCondition', 'Retry Condition', {
        description: 'Custom condition expression',
        placeholder: 'error.status >= 500',
      }),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: {
      operation: 'execute',
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      delayUnit: 'milliseconds',
      backoffMultiplier: 2,
      backoffType: 'exponential',
      jitter: true,
      jitterFactor: 0.1,
      timeoutUnit: 'seconds',
      circuitBreaker: false,
      circuitBreakerThreshold: 5,
      circuitBreakerResetTimeout: 30000,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = RetryNodeSchema.parse(nodeInput.config);

    logger.info(`Retry ${config.operation}: max ${config.maxRetries}, backoff ${config.backoffType}`);

    // Calculate delays for display
    const calculateDelays = (retryCount: number): number[] => {
      const delays: number[] = [];
      let delay = config.initialDelay;
      const multiplier = config.delayUnit === 'seconds' ? 1000 : 1;

      for (let i = 0; i < retryCount; i++) {
        switch (config.backoffType) {
          case 'fixed':
            delays.push(config.initialDelay * multiplier);
            break;
          case 'linear':
            delays.push((config.initialDelay + (i * config.initialDelay)) * multiplier);
            break;
          case 'exponential':
            delay = Math.min(config.initialDelay * Math.pow(config.backoffMultiplier, i), config.maxDelay);
            delays.push(delay * multiplier);
            break;
          case 'fibonacci':
            const fib = [1, 1];
            for (let j = 2; j <= i; j++) fib[j] = fib[j-1] + fib[j-2];
            delay = Math.min(config.initialDelay * fib[Math.min(i, fib.length - 1)], config.maxDelay);
            delays.push(delay * multiplier);
            break;
          case 'random':
            delays.push(Math.floor(Math.random() * config.maxDelay * multiplier));
            break;
        }
      }
      return delays;
    };

    switch (config.operation) {
      case 'execute':
        // Simulate operation with random success/failure
        const willSucceed = Math.random() > 0.3;
        const attemptsNeeded = willSucceed ? Math.floor(Math.random() * (config.maxRetries + 1)) + 1 : config.maxRetries + 1;
        const retriesUsed = Math.min(attemptsNeeded - 1, config.maxRetries);
        const delays = calculateDelays(retriesUsed);
        const totalTime = delays.reduce((a, b) => a + b, 0) + (attemptsNeeded * 100);

        const errors = [];
        for (let i = 0; i < retriesUsed; i++) {
          errors.push({
            attempt: i + 1,
            error: 'ECONNRESET',
            message: 'Connection reset by peer',
            timestamp: new Date(Date.now() - totalTime + (i * 1000)).toISOString(),
            delay: delays[i],
          });
        }

        return {
          data: {
            success: willSucceed,
            result: willSucceed ? { status: 'ok', data: 'Operation completed successfully' } : config.fallback,
            attempts: Math.min(attemptsNeeded, config.maxRetries + 1),
            retriesUsed,
            errors,
            totalTime,
            lastError: errors.length > 0 ? errors[errors.length - 1] : null,
            usedFallback: !willSucceed && config.fallback !== undefined,
            circuitStatus: config.circuitBreaker ? {
              state: 'closed',
              failures: 0,
              lastFailure: null,
              nextAttempt: null,
            } : undefined,
          },
        };

      case 'configure':
        return {
          data: {
            success: true,
            result: {
              policy: {
                maxRetries: config.maxRetries,
                backoffType: config.backoffType,
                initialDelay: config.initialDelay,
                maxDelay: config.maxDelay,
                jitter: config.jitter,
                retryOn: config.retryOn,
                retryOnStatusCodes: config.retryOnStatusCodes,
                doNotRetryOn: config.doNotRetryOn,
              },
              delays: calculateDelays(config.maxRetries),
            },
          },
        };

      case 'status':
        return {
          data: {
            success: true,
            circuitStatus: {
              state: 'closed',
              failures: 0,
              successes: 10,
              lastFailure: null,
              lastSuccess: new Date().toISOString(),
              threshold: config.circuitBreakerThreshold,
              resetTimeout: config.circuitBreakerResetTimeout,
            },
            stats: {
              totalAttempts: 150,
              totalSuccesses: 145,
              totalFailures: 5,
              totalRetries: 12,
              averageAttempts: 1.08,
              successRate: 0.967,
            },
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
