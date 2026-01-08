import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const QueueTriggerSchema = z.object({
  queueType: z.enum(['rabbitmq', 'sqs', 'redis', 'kafka']).default('rabbitmq'),
  queueName: z.string().min(1),
  consumerTag: z.string().optional(),
  prefetchCount: z.number().min(1).default(1),
  autoAck: z.boolean().default(false),
  deadLetterQueue: z.string().optional(),
  maxRetries: z.number().min(0).default(3),
  credentialId: z.string().optional(),
});

export type QueueTriggerConfig = z.infer<typeof QueueTriggerSchema>;

export const queueTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.queue',
    category: 'trigger',
    name: 'Queue Trigger',
    description: 'Consume messages from RabbitMQ, SQS, Redis, or Kafka',
    icon: 'Inbox',
    inputs: [
      input.select(
        'queueType',
        'Queue Type',
        [
          { label: 'RabbitMQ', value: 'rabbitmq' },
          { label: 'AWS SQS', value: 'sqs' },
          { label: 'Redis (Bull/BullMQ)', value: 'redis' },
          { label: 'Apache Kafka', value: 'kafka' },
        ],
        { default: 'rabbitmq' }
      ),
      input.string('queueName', 'Queue Name', {
        description: 'Queue name or topic to consume from',
        placeholder: 'my-queue',
        required: true,
      }),
      input.string('consumerTag', 'Consumer Tag', {
        description: 'Unique identifier for this consumer',
        placeholder: 'ws-flows-consumer',
      }),
      input.number('prefetchCount', 'Prefetch Count', {
        description: 'Number of messages to prefetch (concurrency)',
        default: 1,
        min: 1,
        max: 100,
      }),
      input.boolean('autoAck', 'Auto Acknowledge', {
        description: 'Automatically acknowledge messages on receipt',
        default: false,
      }),
      input.string('deadLetterQueue', 'Dead Letter Queue', {
        description: 'Queue for failed messages after max retries',
        placeholder: 'my-queue-dlq',
      }),
      input.number('maxRetries', 'Max Retries', {
        description: 'Maximum retry attempts before dead lettering',
        default: 3,
        min: 0,
        max: 10,
      }),
      input.credential('credentialId', 'Queue Credentials', {
        description: 'Connection credentials for the queue service',
        credentialTypes: ['API_KEY', 'AWS', 'BASIC_AUTH'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'Trigger event data' })],
    defaults: {
      queueType: 'rabbitmq',
      queueName: '',
      consumerTag: '',
      prefetchCount: 1,
      autoAck: false,
      deadLetterQueue: '',
      maxRetries: 3,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = QueueTriggerSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`Queue trigger activated: ${config.queueType}/${config.queueName}`);

    // Parse message content
    let messageContent = data.message || data.body || {};
    if (typeof messageContent === 'string') {
      try {
        messageContent = JSON.parse(messageContent);
      } catch {
        // Keep as string if not valid JSON
      }
    }

    return {
      data: {
        message: messageContent,
        messageId: data.messageId || `msg_${Date.now()}`,
        headers: data.headers || {},
        queueName: config.queueName,
        deliveryAttempt: (data.deliveryAttempt as number) || 1,
        timestamp: data.timestamp || new Date().toISOString(),
        metadata: {
          queueType: config.queueType,
          consumerTag: config.consumerTag,
          autoAck: config.autoAck,
          ...(data.metadata as object || {}),
        },
        triggerType: 'queue',
        triggeredAt: new Date().toISOString(),
      },
    };
  }
);
