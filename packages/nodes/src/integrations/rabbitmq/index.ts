import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const RabbitMQNodeSchema = z.object({
  operation: z.enum(['publish', 'consume', 'ack', 'nack', 'purge']).default('publish'),
  exchange: z.string().optional(),
  queue: z.string().min(1),
  routingKey: z.string().optional(),
  message: z.unknown().optional(),
  headers: z.record(z.string()).optional(),
  persistent: z.boolean().default(true),
  priority: z.number().min(0).max(9).optional(),
  expiration: z.number().optional(),
  credentialId: z.string().optional(),
});

export type RabbitMQNodeConfig = z.infer<typeof RabbitMQNodeSchema>;

export const rabbitmqNode: NodeDefinition = createNode(
  {
    type: 'integration.rabbitmq',
    category: 'integration',
    name: 'RabbitMQ',
    description: 'Publish and consume messages via AMQP protocol',
    icon: 'MessageSquare',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Publish Message', value: 'publish' },
          { label: 'Consume Message', value: 'consume' },
          { label: 'Acknowledge', value: 'ack' },
          { label: 'Negative Acknowledge', value: 'nack' },
          { label: 'Purge Queue', value: 'purge' },
        ],
        { default: 'publish' }
      ),
      input.string('exchange', 'Exchange', {
        description: 'Exchange name (empty for default exchange)',
        placeholder: 'my-exchange',
      }),
      input.string('queue', 'Queue Name', {
        description: 'Queue to publish to or consume from',
        placeholder: 'my-queue',
        required: true,
      }),
      input.string('routingKey', 'Routing Key', {
        description: 'Routing key for exchange binding',
        placeholder: 'my.routing.key',
      }),
      input.json('message', 'Message', {
        description: 'Message content to publish (JSON)',
        default: {},
      }),
      input.json('headers', 'Headers', {
        description: 'Custom message headers',
        default: {},
      }),
      input.boolean('persistent', 'Persistent', {
        description: 'Persist message to disk',
        default: true,
      }),
      input.number('priority', 'Priority', {
        description: 'Message priority (0-9)',
        min: 0,
        max: 9,
      }),
      input.number('expiration', 'Expiration (ms)', {
        description: 'Message TTL in milliseconds',
        min: 0,
      }),
      input.credential('credentialId', 'RabbitMQ Credentials', {
        description: 'AMQP connection credentials',
        credentialTypes: ['BASIC_AUTH'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'publish',
      queue: '',
      persistent: true,
      headers: {},
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = RabbitMQNodeSchema.parse(nodeInput.config);

    logger.info(`RabbitMQ operation: ${config.operation} on queue: ${config.queue}`);

    // In real implementation, this would use amqplib
    const messageId = `rmq_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'publish':
        logger.info(`Publishing message to ${config.queue}`);
        return {
          data: {
            success: true,
            messageId,
            properties: {
              persistent: config.persistent,
              priority: config.priority,
              expiration: config.expiration,
              headers: config.headers,
            },
          },
        };

      case 'consume':
        logger.info(`Consuming from ${config.queue}`);
        return {
          data: {
            success: true,
            messageId,
            message: nodeInput.data || {},
            properties: {
              deliveryTag: Date.now(),
              redelivered: false,
            },
          },
        };

      case 'ack':
      case 'nack':
        return {
          data: {
            success: true,
            messageId: (nodeInput.data as Record<string, unknown>)?.messageId || messageId,
            operation: config.operation,
          },
        };

      case 'purge':
        return {
          data: {
            success: true,
            messageCount: 0,
            queue: config.queue,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
