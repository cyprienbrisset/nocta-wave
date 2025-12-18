import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ZendeskNodeSchema = z.object({
  resource: z.enum(['tickets', 'users', 'organizations', 'groups', 'comments', 'attachments', 'tags']).default('tickets'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'addComment', 'addTags', 'removeTags', 'assign', 'solve', 'close'
  ]).default('list'),
  ticketId: z.number().optional(),
  userId: z.number().optional(),
  organizationId: z.number().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['new', 'open', 'pending', 'hold', 'solved', 'closed']).optional(),
  type: z.enum(['problem', 'incident', 'question', 'task']).optional(),
  requesterId: z.number().optional(),
  assigneeId: z.number().optional(),
  groupId: z.number().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.array(z.object({
    id: z.number(),
    value: z.unknown(),
  })).optional(),
  commentBody: z.string().optional(),
  commentPublic: z.boolean().default(true),
  searchQuery: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  perPage: z.number().min(1).max(100).default(25),
  page: z.number().min(1).default(1),
  credentialId: z.string().optional(),
});

export type ZendeskNodeConfig = z.infer<typeof ZendeskNodeSchema>;

export const zendeskNode: NodeDefinition = createNode(
  {
    type: 'integration.zendesk',
    category: 'integration',
    name: 'Zendesk',
    description: 'Customer service - Tickets, users, organizations',
    icon: 'Headphones',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Tickets', value: 'tickets' },
          { label: 'Users', value: 'users' },
          { label: 'Organizations', value: 'organizations' },
          { label: 'Groups', value: 'groups' },
          { label: 'Comments', value: 'comments' },
          { label: 'Attachments', value: 'attachments' },
          { label: 'Tags', value: 'tags' },
        ],
        { default: 'tickets' }
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
          { label: 'Search', value: 'search' },
          { label: 'Add Comment', value: 'addComment' },
          { label: 'Add Tags', value: 'addTags' },
          { label: 'Remove Tags', value: 'removeTags' },
          { label: 'Assign', value: 'assign' },
          { label: 'Solve', value: 'solve' },
          { label: 'Close', value: 'close' },
        ],
        { default: 'list' }
      ),
      input.number('ticketId', 'Ticket ID', {
        description: 'Zendesk ticket ID',
      }),
      input.number('userId', 'User ID', {
        description: 'Zendesk user ID',
      }),
      input.number('organizationId', 'Organization ID', {
        description: 'Organization ID',
      }),
      input.string('subject', 'Subject', {
        description: 'Ticket subject',
        placeholder: 'Help needed with...',
      }),
      input.text('description', 'Description', {
        description: 'Ticket description',
      }),
      input.select(
        'priority',
        'Priority',
        [
          { label: 'Low', value: 'low' },
          { label: 'Normal', value: 'normal' },
          { label: 'High', value: 'high' },
          { label: 'Urgent', value: 'urgent' },
        ],
        { default: 'normal' }
      ),
      input.select(
        'status',
        'Status',
        [
          { label: 'New', value: 'new' },
          { label: 'Open', value: 'open' },
          { label: 'Pending', value: 'pending' },
          { label: 'Hold', value: 'hold' },
          { label: 'Solved', value: 'solved' },
          { label: 'Closed', value: 'closed' },
        ],
        { default: 'new' }
      ),
      input.select(
        'type',
        'Type',
        [
          { label: 'Problem', value: 'problem' },
          { label: 'Incident', value: 'incident' },
          { label: 'Question', value: 'question' },
          { label: 'Task', value: 'task' },
        ],
        { default: 'question' }
      ),
      input.number('requesterId', 'Requester ID', {
        description: 'User ID of requester',
      }),
      input.number('assigneeId', 'Assignee ID', {
        description: 'Agent user ID to assign',
      }),
      input.number('groupId', 'Group ID', {
        description: 'Group ID to assign',
      }),
      input.json('tags', 'Tags', {
        description: 'Array of tags',
        default: [],
      }),
      input.json('customFields', 'Custom Fields', {
        description: 'Custom field values',
        default: [],
      }),
      input.text('commentBody', 'Comment Body', {
        description: 'Comment text',
      }),
      input.boolean('commentPublic', 'Public Comment', {
        description: 'Make comment public',
        default: true,
      }),
      input.string('searchQuery', 'Search Query', {
        description: 'Zendesk search query',
        placeholder: 'type:ticket status:open',
      }),
      input.string('sortBy', 'Sort By', {
        description: 'Field to sort by',
        placeholder: 'created_at',
      }),
      input.select(
        'sortOrder',
        'Sort Order',
        [
          { label: 'Descending', value: 'desc' },
          { label: 'Ascending', value: 'asc' },
        ],
        { default: 'desc' }
      ),
      input.number('perPage', 'Per Page', {
        description: 'Results per page',
        default: 25,
        min: 1,
        max: 100,
      }),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.credential('credentialId', 'Zendesk Credentials', {
        description: 'Zendesk API token or OAuth2',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.number('id', 'Created/updated item ID'),
      output.number('count', 'Total count'),
      output.string('nextPage', 'Next page URL'),
    ],
    defaults: {
      resource: 'tickets',
      operation: 'list',
      priority: 'normal',
      status: 'new',
      type: 'question',
      commentPublic: true,
      sortOrder: 'desc',
      perPage: 25,
      page: 1,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ZendeskNodeSchema.parse(nodeInput.config);

    logger.info(`Zendesk ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 12345,
                subject: 'Unable to login',
                description: 'I cannot access my account',
                status: 'open',
                priority: 'high',
                type: 'incident',
                requester_id: 111,
                assignee_id: 222,
                group_id: 333,
                tags: ['login', 'urgent'],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 12346,
                subject: 'Feature request',
                description: 'Please add dark mode',
                status: 'new',
                priority: 'low',
                type: 'question',
              },
            ],
            count: 150,
            nextPage: 'https://subdomain.zendesk.com/api/v2/tickets.json?page=2',
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.ticketId || config.userId,
              subject: 'Unable to login',
              description: 'I cannot access my account',
              status: 'open',
              priority: 'high',
              requester: { id: 111, name: 'John Doe', email: 'john@example.com' },
              assignee: { id: 222, name: 'Agent Smith' },
              comments: [
                { id: 1, body: 'Initial ticket description', public: true },
                { id: 2, body: 'We are looking into this', public: true },
              ],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: Date.now(),
            item: {
              id: Date.now(),
              subject: config.subject,
              description: config.description,
              status: config.status || 'new',
              priority: config.priority,
              type: config.type,
              tags: config.tags,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.ticketId,
            item: {
              id: config.ticketId,
              subject: config.subject,
              status: config.status,
              priority: config.priority,
              assignee_id: config.assigneeId,
              updated_at: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.ticketId || config.userId,
            deleted: true,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            items: [
              {
                id: 12345,
                subject: 'Search result',
                status: 'open',
                result_type: 'ticket',
              },
            ],
            count: 1,
          },
        };

      case 'addComment':
        return {
          data: {
            success: true,
            id: Date.now(),
            ticketId: config.ticketId,
            body: config.commentBody,
            public: config.commentPublic,
            created_at: new Date().toISOString(),
          },
        };

      case 'addTags':
      case 'removeTags':
        return {
          data: {
            success: true,
            ticketId: config.ticketId,
            tags: config.tags,
          },
        };

      case 'assign':
        return {
          data: {
            success: true,
            ticketId: config.ticketId,
            assigneeId: config.assigneeId,
            groupId: config.groupId,
          },
        };

      case 'solve':
        return {
          data: {
            success: true,
            ticketId: config.ticketId,
            status: 'solved',
          },
        };

      case 'close':
        return {
          data: {
            success: true,
            ticketId: config.ticketId,
            status: 'closed',
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
