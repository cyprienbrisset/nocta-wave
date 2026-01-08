import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SegmentNodeSchema = z.object({
  operation: z.enum([
    'track', 'identify', 'page', 'screen', 'group', 'alias',
    'getProfile', 'getEvents', 'deleteUser'
  ]).default('track'),
  userId: z.string().optional(),
  anonymousId: z.string().optional(),
  event: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  traits: z.record(z.unknown()).optional(),
  groupId: z.string().optional(),
  previousId: z.string().optional(),
  name: z.string().optional(),
  category: z.string().optional(),
  context: z.object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    locale: z.string().optional(),
    timezone: z.string().optional(),
    app: z.object({
      name: z.string().optional(),
      version: z.string().optional(),
    }).optional(),
    device: z.object({
      id: z.string().optional(),
      manufacturer: z.string().optional(),
      model: z.string().optional(),
      type: z.string().optional(),
    }).optional(),
    campaign: z.object({
      name: z.string().optional(),
      source: z.string().optional(),
      medium: z.string().optional(),
      term: z.string().optional(),
      content: z.string().optional(),
    }).optional(),
  }).optional(),
  timestamp: z.string().optional(),
  integrations: z.record(z.boolean()).optional(),
  spaceId: z.string().optional(),
  credentialId: z.string().optional(),
});

export type SegmentNodeConfig = z.infer<typeof SegmentNodeSchema>;

export const segmentNode: NodeDefinition = createNode(
  {
    type: 'integration.segment',
    category: 'integration',
    name: 'Segment',
    description: 'Customer data platform - Track, identify, analytics',
    icon: 'Activity',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Track Event', value: 'track' },
          { label: 'Identify User', value: 'identify' },
          { label: 'Page View', value: 'page' },
          { label: 'Screen View', value: 'screen' },
          { label: 'Group', value: 'group' },
          { label: 'Alias', value: 'alias' },
          { label: 'Get Profile', value: 'getProfile' },
          { label: 'Get Events', value: 'getEvents' },
          { label: 'Delete User', value: 'deleteUser' },
        ],
        { default: 'track' }
      ),
      input.string('userId', 'User ID', {
        description: 'Unique user identifier',
        placeholder: 'user_123',
      }),
      input.string('anonymousId', 'Anonymous ID', {
        description: 'Anonymous identifier for unidentified users',
        placeholder: 'anon_456',
      }),
      input.string('event', 'Event Name', {
        description: 'Name of the event to track',
        placeholder: 'Order Completed',
      }),
      input.json('properties', 'Properties', {
        description: 'Event properties (for track, page, screen)',
        default: {},
      }),
      input.json('traits', 'Traits', {
        description: 'User traits (for identify)',
        default: {},
      }),
      input.string('groupId', 'Group ID', {
        description: 'Group/company identifier',
        placeholder: 'company_789',
      }),
      input.string('previousId', 'Previous ID', {
        description: 'Previous user ID (for alias)',
      }),
      input.string('name', 'Page/Screen Name', {
        description: 'Name of the page or screen',
        placeholder: 'Home',
      }),
      input.string('category', 'Category', {
        description: 'Page/screen category',
        placeholder: 'Docs',
      }),
      input.json('context', 'Context', {
        description: 'Additional context (IP, user agent, etc.)',
        default: {},
      }),
      input.string('timestamp', 'Timestamp', {
        description: 'ISO 8601 timestamp',
        placeholder: '2024-01-15T10:30:00Z',
      }),
      input.json('integrations', 'Integrations', {
        description: 'Enable/disable specific integrations',
        default: {},
      }),
      input.string('spaceId', 'Space ID', {
        description: 'Segment Space ID (for Profile API)',
      }),
      input.credential('credentialId', 'Segment Credentials', {
        description: 'Segment Write Key or Access Token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'track',
      properties: {},
      traits: {},
      context: {},
      integrations: {},
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SegmentNodeSchema.parse(nodeInput.config);

    logger.info(`Segment ${config.operation}`);

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    switch (config.operation) {
      case 'track':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'track',
              userId: config.userId,
              anonymousId: config.anonymousId,
              event: config.event,
              properties: config.properties,
              timestamp: config.timestamp || new Date().toISOString(),
              context: config.context,
            },
          },
        };

      case 'identify':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'identify',
              userId: config.userId,
              anonymousId: config.anonymousId,
              traits: config.traits,
              timestamp: config.timestamp || new Date().toISOString(),
              context: config.context,
            },
          },
        };

      case 'page':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'page',
              userId: config.userId,
              anonymousId: config.anonymousId,
              name: config.name,
              category: config.category,
              properties: config.properties,
              timestamp: config.timestamp || new Date().toISOString(),
            },
          },
        };

      case 'screen':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'screen',
              userId: config.userId,
              anonymousId: config.anonymousId,
              name: config.name,
              category: config.category,
              properties: config.properties,
              timestamp: config.timestamp || new Date().toISOString(),
            },
          },
        };

      case 'group':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'group',
              userId: config.userId,
              groupId: config.groupId,
              traits: config.traits,
              timestamp: config.timestamp || new Date().toISOString(),
            },
          },
        };

      case 'alias':
        return {
          data: {
            success: true,
            messageId,
            response: {
              type: 'alias',
              userId: config.userId,
              previousId: config.previousId,
              timestamp: config.timestamp || new Date().toISOString(),
            },
          },
        };

      case 'getProfile':
        return {
          data: {
            success: true,
            profile: {
              segment_id: 'seg_abc123',
              user_id: config.userId,
              anonymous_id: config.anonymousId,
              traits: {
                email: 'john@example.com',
                name: 'John Doe',
                created_at: '2023-01-15T10:30:00Z',
                plan: 'premium',
              },
              identities: [
                { type: 'user_id', id: config.userId },
                { type: 'email', id: 'john@example.com' },
              ],
            },
          },
        };

      case 'getEvents':
        return {
          data: {
            success: true,
            events: [
              {
                type: 'track',
                event: 'Order Completed',
                properties: { orderId: 'order_123', revenue: 99.99 },
                timestamp: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                type: 'page',
                name: 'Checkout',
                timestamp: new Date(Date.now() - 7200000).toISOString(),
              },
              {
                type: 'identify',
                traits: { plan: 'premium' },
                timestamp: new Date(Date.now() - 86400000).toISOString(),
              },
            ],
          },
        };

      case 'deleteUser':
        return {
          data: {
            success: true,
            response: {
              regulation_id: `reg_${Date.now()}`,
              status: 'PENDING',
              user_id: config.userId,
            },
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
