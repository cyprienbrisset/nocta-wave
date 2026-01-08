import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const RedisSchema = z.object({
  operation: z.enum(['get', 'set', 'del', 'hget', 'hset', 'lpush', 'rpush', 'lpop', 'rpop', 'publish']).default('get'),
  key: z.string().min(1),
  value: z.unknown().optional(),
  field: z.string().optional(),
  ttl: z.number().optional(),
  channel: z.string().optional(),
});

export const redisNode: NodeDefinition = createNode(
  {
    type: 'database.redis',
    category: 'database',
    name: 'Redis',
    description: 'Execute Redis commands',
    icon: 'Database',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'GET', value: 'get' },
        { label: 'SET', value: 'set' },
        { label: 'DEL', value: 'del' },
        { label: 'HGET', value: 'hget' },
        { label: 'HSET', value: 'hset' },
        { label: 'LPUSH', value: 'lpush' },
        { label: 'RPUSH', value: 'rpush' },
        { label: 'LPOP', value: 'lpop' },
        { label: 'RPOP', value: 'rpop' },
        { label: 'PUBLISH', value: 'publish' },
      ], { default: 'get' }),
      input.string('key', 'Key', { required: true, description: 'Redis key' }),
      input.json('value', 'Value', { description: 'Value to set' }),
      input.string('field', 'Field', { description: 'Hash field (for HGET/HSET)' }),
      input.number('ttl', 'TTL (seconds)', { description: 'Time to live' }),
      input.string('channel', 'Channel', { description: 'Pub/Sub channel' }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    credentials: ['custom'],
  },
  async (nodeInput, context) => {
    const config = RedisSchema.parse(nodeInput.config);
    context.logger.info(`Redis: ${config.operation} ${config.key}`);
    return { data: { result: null, __needsExecution: true } };
  }
);
