import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MailchimpNodeSchema = z.object({
  resource: z.enum(['lists', 'members', 'campaigns', 'templates', 'automations', 'tags', 'segments']).default('members'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'subscribe', 'unsubscribe', 'addTag', 'removeTag',
    'send', 'schedule', 'pause', 'resume'
  ]).default('list'),
  listId: z.string().optional(),
  memberId: z.string().optional(),
  campaignId: z.string().optional(),
  templateId: z.number().optional(),
  automationId: z.string().optional(),
  email: z.string().email().optional(),
  status: z.enum(['subscribed', 'unsubscribed', 'cleaned', 'pending', 'transactional']).optional(),
  mergeFields: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  campaignType: z.enum(['regular', 'plaintext', 'absplit', 'rss', 'variate']).default('regular'),
  subject: z.string().optional(),
  fromName: z.string().optional(),
  replyTo: z.string().optional(),
  htmlContent: z.string().optional(),
  scheduleTime: z.string().optional(),
  segmentId: z.number().optional(),
  count: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
  credentialId: z.string().optional(),
});

export type MailchimpNodeConfig = z.infer<typeof MailchimpNodeSchema>;

export const mailchimpNode: NodeDefinition = createNode(
  {
    type: 'integration.mailchimp',
    category: 'integration',
    name: 'Mailchimp',
    description: 'Email marketing - Lists, campaigns, subscribers',
    icon: 'Mail',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Audience Members', value: 'members' },
          { label: 'Audiences (Lists)', value: 'lists' },
          { label: 'Campaigns', value: 'campaigns' },
          { label: 'Templates', value: 'templates' },
          { label: 'Automations', value: 'automations' },
          { label: 'Tags', value: 'tags' },
          { label: 'Segments', value: 'segments' },
        ],
        { default: 'members' }
      ),
      input.select(
        'operation',
        'Operation',
        [
          { label: 'List', value: 'list' },
          { label: 'Get', value: 'get' },
          { label: 'Create', value: 'create' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
          { label: 'Subscribe', value: 'subscribe' },
          { label: 'Unsubscribe', value: 'unsubscribe' },
          { label: 'Add Tag', value: 'addTag' },
          { label: 'Remove Tag', value: 'removeTag' },
          { label: 'Send Campaign', value: 'send' },
          { label: 'Schedule', value: 'schedule' },
          { label: 'Pause', value: 'pause' },
          { label: 'Resume', value: 'resume' },
        ],
        { default: 'list' }
      ),
      input.string('listId', 'Audience ID', {
        description: 'Mailchimp audience/list ID',
      }),
      input.string('memberId', 'Member ID', {
        description: 'Subscriber MD5 hash or email',
      }),
      input.string('campaignId', 'Campaign ID', {
        description: 'Campaign ID',
      }),
      input.number('templateId', 'Template ID', {
        description: 'Email template ID',
      }),
      input.string('automationId', 'Automation ID', {
        description: 'Automation workflow ID',
      }),
      input.string('email', 'Email', {
        description: 'Subscriber email address',
        placeholder: 'user@example.com',
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Subscribed', value: 'subscribed' },
          { label: 'Unsubscribed', value: 'unsubscribed' },
          { label: 'Cleaned', value: 'cleaned' },
          { label: 'Pending', value: 'pending' },
          { label: 'Transactional', value: 'transactional' },
        ],
        { default: 'subscribed' }
      ),
      input.json('mergeFields', 'Merge Fields', {
        description: 'Merge field values (FNAME, LNAME, etc.)',
        default: {},
      }),
      input.json('tags', 'Tags', {
        description: 'Array of tag names',
        default: [],
      }),
      input.select(
        'campaignType',
        'Campaign Type',
        [
          { label: 'Regular', value: 'regular' },
          { label: 'Plain Text', value: 'plaintext' },
          { label: 'A/B Split', value: 'absplit' },
          { label: 'RSS', value: 'rss' },
          { label: 'Multivariate', value: 'variate' },
        ],
        { default: 'regular' }
      ),
      input.string('subject', 'Subject', {
        description: 'Email subject line',
        placeholder: 'Your newsletter is here!',
      }),
      input.string('fromName', 'From Name', {
        description: 'Sender name',
        placeholder: 'Your Company',
      }),
      input.string('replyTo', 'Reply To', {
        description: 'Reply-to email address',
      }),
      input.text('htmlContent', 'HTML Content', {
        description: 'Email HTML content',
      }),
      input.string('scheduleTime', 'Schedule Time', {
        description: 'ISO 8601 datetime for scheduled send',
        placeholder: '2024-01-15T10:00:00Z',
      }),
      input.number('segmentId', 'Segment ID', {
        description: 'Saved segment ID to target',
      }),
      input.number('count', 'Count', {
        description: 'Number of results to return',
        default: 100,
        min: 1,
        max: 1000,
      }),
      input.number('offset', 'Offset', {
        description: 'Starting position',
        default: 0,
        min: 0,
      }),
      input.credential('credentialId', 'Mailchimp Credentials', {
        description: 'Mailchimp API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'members',
      operation: 'list',
      status: 'subscribed',
      campaignType: 'regular',
      count: 100,
      offset: 0,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MailchimpNodeSchema.parse(nodeInput.config);

    logger.info(`Mailchimp ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        if (config.resource === 'members') {
          return {
            data: {
              success: true,
              items: [
                {
                  id: 'abc123def456',
                  email_address: 'john@example.com',
                  status: 'subscribed',
                  merge_fields: { FNAME: 'John', LNAME: 'Doe' },
                  tags: [{ id: 1, name: 'VIP' }],
                  stats: { avg_open_rate: 45.5, avg_click_rate: 12.3 },
                  timestamp_opt: new Date().toISOString(),
                },
              ],
              totalItems: 1500,
            },
          };
        }
        return {
          data: {
            success: true,
            items: [
              {
                id: 'list_abc123',
                name: 'Main Newsletter',
                stats: { member_count: 5000, unsubscribe_count: 50 },
              },
            ],
            totalItems: 3,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.memberId || config.campaignId || config.listId,
              email_address: config.email,
              status: 'subscribed',
              merge_fields: { FNAME: 'John', LNAME: 'Doe' },
              tags: [{ id: 1, name: 'VIP' }],
              stats: { avg_open_rate: 45.5, avg_click_rate: 12.3 },
              source: 'API',
              timestamp_signup: new Date().toISOString(),
            },
          },
        };

      case 'subscribe':
      case 'create':
        return {
          data: {
            success: true,
            id: `member_${Date.now()}`,
            item: {
              id: `member_${Date.now()}`,
              email_address: config.email,
              status: config.status || 'subscribed',
              merge_fields: config.mergeFields,
              tags: config.tags,
              timestamp_opt: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.memberId,
            item: {
              id: config.memberId,
              email_address: config.email,
              status: config.status,
              merge_fields: config.mergeFields,
              last_changed: new Date().toISOString(),
            },
          },
        };

      case 'unsubscribe':
        return {
          data: {
            success: true,
            id: config.memberId,
            email_address: config.email,
            status: 'unsubscribed',
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.memberId || config.campaignId,
            deleted: true,
          },
        };

      case 'addTag':
      case 'removeTag':
        return {
          data: {
            success: true,
            memberId: config.memberId,
            tags: config.tags,
            operation: config.operation,
          },
        };

      case 'send':
        return {
          data: {
            success: true,
            campaignId: config.campaignId,
            status: 'sent',
            send_time: new Date().toISOString(),
          },
        };

      case 'schedule':
        return {
          data: {
            success: true,
            campaignId: config.campaignId,
            status: 'schedule',
            schedule_time: config.scheduleTime,
          },
        };

      case 'pause':
      case 'resume':
        return {
          data: {
            success: true,
            automationId: config.automationId,
            status: config.operation === 'pause' ? 'paused' : 'sending',
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
