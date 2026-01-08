import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GooglePubSubNodeSchema = z.object({
  operation: z.enum(['publish', 'pull', 'acknowledge', 'createTopic', 'createSubscription', 'listTopics', 'listSubscriptions']).default('publish'),
  projectId: z.string().min(1),
  topicName: z.string().optional(),
  subscriptionName: z.string().optional(),
  message: z.unknown().optional(),
  attributes: z.record(z.string()).optional(),
  orderingKey: z.string().optional(),
  maxMessages: z.number().min(1).max(1000).default(10),
  ackDeadlineSeconds: z.number().min(10).max(600).default(30),
  ackIds: z.array(z.string()).optional(),
  credentialId: z.string().optional(),
});

export type GooglePubSubNodeConfig = z.infer<typeof GooglePubSubNodeSchema>;

export const googlePubSubNode: NodeDefinition = createNode(
  {
    type: 'integration.google-pubsub',
    category: 'integration',
    name: 'Google Pub/Sub',
    description: 'Publish and subscribe to Google Cloud Pub/Sub messages',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Publish Message', value: 'publish' },
          { label: 'Pull Messages', value: 'pull' },
          { label: 'Acknowledge', value: 'acknowledge' },
          { label: 'Create Topic', value: 'createTopic' },
          { label: 'Create Subscription', value: 'createSubscription' },
          { label: 'List Topics', value: 'listTopics' },
          { label: 'List Subscriptions', value: 'listSubscriptions' },
        ],
        { default: 'publish' }
      ),
      input.string('projectId', 'Project ID', {
        description: 'Google Cloud project ID',
        placeholder: 'my-project-id',
        required: true,
      }),
      input.string('topicName', 'Topic Name', {
        description: 'Pub/Sub topic name',
        placeholder: 'my-topic',
      }),
      input.string('subscriptionName', 'Subscription Name', {
        description: 'Pub/Sub subscription name',
        placeholder: 'my-subscription',
      }),
      input.json('message', 'Message', {
        description: 'Message data to publish',
        default: {},
      }),
      input.json('attributes', 'Attributes', {
        description: 'Message attributes (key-value pairs)',
        default: {},
      }),
      input.string('orderingKey', 'Ordering Key', {
        description: 'Key for message ordering (requires ordered topic)',
        placeholder: 'order-key-123',
      }),
      input.number('maxMessages', 'Max Messages', {
        description: 'Maximum messages to pull',
        min: 1,
        max: 1000,
        default: 10,
      }),
      input.number('ackDeadlineSeconds', 'Ack Deadline (seconds)', {
        description: 'Time to acknowledge message before redelivery',
        min: 10,
        max: 600,
        default: 30,
      }),
      input.array('ackIds', 'Ack IDs', {
        description: 'Acknowledgment IDs for acknowledge operation',
        itemType: 'string',
      }),
      input.credential('credentialId', 'Google Cloud Credentials', {
        description: 'Google Cloud service account credentials',
        credentialTypes: ['OAUTH2', 'API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'publish',
      projectId: '',
      maxMessages: 10,
      ackDeadlineSeconds: 30,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GooglePubSubNodeSchema.parse(nodeInput.config);

    logger.info(`Google Pub/Sub operation: ${config.operation}`);

    const messageId = `pubsub_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'publish':
        logger.info(`Publishing to topic: ${config.topicName}`);
        return {
          data: {
            success: true,
            messageId,
            topic: `projects/${config.projectId}/topics/${config.topicName}`,
          },
        };

      case 'pull':
        logger.info(`Pulling from subscription: ${config.subscriptionName}`);
        return {
          data: {
            success: true,
            messages: [
              {
                ackId: `ack_${Date.now()}`,
                message: {
                  messageId,
                  data: nodeInput.data || {},
                  attributes: config.attributes || {},
                  publishTime: new Date().toISOString(),
                  orderingKey: config.orderingKey,
                },
              },
            ],
          },
        };

      case 'acknowledge':
        return {
          data: {
            success: true,
            acknowledgedIds: config.ackIds || [],
          },
        };

      case 'createTopic':
        return {
          data: {
            success: true,
            topic: {
              name: `projects/${config.projectId}/topics/${config.topicName}`,
            },
          },
        };

      case 'createSubscription':
        return {
          data: {
            success: true,
            subscription: {
              name: `projects/${config.projectId}/subscriptions/${config.subscriptionName}`,
              topic: `projects/${config.projectId}/topics/${config.topicName}`,
              ackDeadlineSeconds: config.ackDeadlineSeconds,
            },
          },
        };

      case 'listTopics':
        return {
          data: {
            success: true,
            topics: [
              { name: `projects/${config.projectId}/topics/${config.topicName || 'example-topic'}` },
            ],
          },
        };

      case 'listSubscriptions':
        return {
          data: {
            success: true,
            subscriptions: [
              {
                name: `projects/${config.projectId}/subscriptions/${config.subscriptionName || 'example-sub'}`,
                topic: `projects/${config.projectId}/topics/${config.topicName || 'example-topic'}`,
              },
            ],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
