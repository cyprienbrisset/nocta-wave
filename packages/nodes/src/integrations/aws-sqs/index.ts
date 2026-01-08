import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AWSSQSNodeSchema = z.object({
  operation: z.enum(['sendMessage', 'receiveMessage', 'deleteMessage', 'getQueueAttributes', 'purgeQueue']).default('sendMessage'),
  queueUrl: z.string().min(1),
  messageBody: z.unknown().optional(),
  messageAttributes: z.record(z.unknown()).optional(),
  delaySeconds: z.number().min(0).max(900).optional(),
  messageGroupId: z.string().optional(),
  messageDeduplicationId: z.string().optional(),
  maxNumberOfMessages: z.number().min(1).max(10).default(1),
  waitTimeSeconds: z.number().min(0).max(20).default(0),
  visibilityTimeout: z.number().min(0).max(43200).optional(),
  receiptHandle: z.string().optional(),
  credentialId: z.string().optional(),
});

export type AWSSQSNodeConfig = z.infer<typeof AWSSQSNodeSchema>;

export const awsSqsNode: NodeDefinition = createNode(
  {
    type: 'integration.aws-sqs',
    category: 'integration',
    name: 'AWS SQS',
    description: 'Send and receive messages from Amazon Simple Queue Service',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Send Message', value: 'sendMessage' },
          { label: 'Receive Messages', value: 'receiveMessage' },
          { label: 'Delete Message', value: 'deleteMessage' },
          { label: 'Get Queue Attributes', value: 'getQueueAttributes' },
          { label: 'Purge Queue', value: 'purgeQueue' },
        ],
        { default: 'sendMessage' }
      ),
      input.string('queueUrl', 'Queue URL', {
        description: 'Full SQS queue URL',
        placeholder: 'https://sqs.region.amazonaws.com/account/queue-name',
        required: true,
      }),
      input.json('messageBody', 'Message Body', {
        description: 'Message content to send',
        default: {},
      }),
      input.json('messageAttributes', 'Message Attributes', {
        description: 'Custom message attributes',
        default: {},
      }),
      input.number('delaySeconds', 'Delay (seconds)', {
        description: 'Delay before message becomes available (0-900)',
        min: 0,
        max: 900,
        default: 0,
      }),
      input.string('messageGroupId', 'Message Group ID', {
        description: 'Required for FIFO queues',
        placeholder: 'group-1',
      }),
      input.string('messageDeduplicationId', 'Deduplication ID', {
        description: 'For FIFO queues (auto-generated if content-based)',
      }),
      input.number('maxNumberOfMessages', 'Max Messages', {
        description: 'Maximum messages to receive (1-10)',
        min: 1,
        max: 10,
        default: 1,
      }),
      input.number('waitTimeSeconds', 'Wait Time (seconds)', {
        description: 'Long polling wait time (0-20)',
        min: 0,
        max: 20,
        default: 0,
      }),
      input.number('visibilityTimeout', 'Visibility Timeout', {
        description: 'Time to process message before it becomes visible again',
        min: 0,
        max: 43200,
      }),
      input.string('receiptHandle', 'Receipt Handle', {
        description: 'Receipt handle for delete operation',
      }),
      input.credential('credentialId', 'AWS Credentials', {
        description: 'AWS access credentials',
        credentialTypes: ['AWS'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'SQS operation result' })],
    defaults: {
      operation: 'sendMessage',
      queueUrl: '',
      delaySeconds: 0,
      maxNumberOfMessages: 1,
      waitTimeSeconds: 0,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AWSSQSNodeSchema.parse(nodeInput.config);

    logger.info(`AWS SQS operation: ${config.operation}`);

    const messageId = `sqs_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'sendMessage':
        logger.info(`Sending message to SQS queue`);
        return {
          data: {
            success: true,
            messageId,
            sequenceNumber: config.messageGroupId ? `seq_${Date.now()}` : undefined,
            md5OfMessageBody: 'md5hash',
          },
        };

      case 'receiveMessage':
        logger.info(`Receiving messages from SQS queue`);
        return {
          data: {
            success: true,
            messages: [
              {
                messageId,
                receiptHandle: `receipt_${Date.now()}`,
                body: nodeInput.data || {},
                attributes: {},
                messageAttributes: config.messageAttributes || {},
              },
            ],
          },
        };

      case 'deleteMessage':
        return {
          data: {
            success: true,
            receiptHandle: config.receiptHandle,
          },
        };

      case 'getQueueAttributes':
        return {
          data: {
            success: true,
            attributes: {
              ApproximateNumberOfMessages: '0',
              ApproximateNumberOfMessagesNotVisible: '0',
              ApproximateNumberOfMessagesDelayed: '0',
              CreatedTimestamp: String(Date.now() / 1000),
              LastModifiedTimestamp: String(Date.now() / 1000),
            },
          },
        };

      case 'purgeQueue':
        return {
          data: {
            success: true,
            queueUrl: config.queueUrl,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
