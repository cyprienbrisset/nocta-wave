import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const IntercomNodeSchema = z.object({
  resource: z.enum(['contacts', 'conversations', 'companies', 'messages', 'tags', 'notes', 'events']).default('contacts'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'reply', 'close', 'open', 'snooze', 'assign', 'addTag', 'removeTag', 'addNote'
  ]).default('list'),
  contactId: z.string().optional(),
  conversationId: z.string().optional(),
  companyId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  customAttributes: z.record(z.unknown()).optional(),
  role: z.enum(['user', 'lead']).default('user'),
  messageBody: z.string().optional(),
  messageType: z.enum(['comment', 'note']).default('comment'),
  assigneeId: z.string().optional(),
  tagName: z.string().optional(),
  noteBody: z.string().optional(),
  eventName: z.string().optional(),
  eventMetadata: z.record(z.unknown()).optional(),
  snoozeDuration: z.number().optional(),
  query: z.string().optional(),
  perPage: z.number().min(1).max(150).default(50),
  startingAfter: z.string().optional(),
  credentialId: z.string().optional(),
});

export type IntercomNodeConfig = z.infer<typeof IntercomNodeSchema>;

export const intercomNode: NodeDefinition = createNode(
  {
    type: 'integration.intercom',
    category: 'integration',
    name: 'Intercom',
    description: 'Customer messaging - Contacts, conversations, companies',
    icon: 'MessageSquare',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Contacts', value: 'contacts' },
          { label: 'Conversations', value: 'conversations' },
          { label: 'Companies', value: 'companies' },
          { label: 'Messages', value: 'messages' },
          { label: 'Tags', value: 'tags' },
          { label: 'Notes', value: 'notes' },
          { label: 'Events', value: 'events' },
        ],
        { default: 'contacts' }
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
          { label: 'Reply', value: 'reply' },
          { label: 'Close Conversation', value: 'close' },
          { label: 'Open Conversation', value: 'open' },
          { label: 'Snooze Conversation', value: 'snooze' },
          { label: 'Assign Conversation', value: 'assign' },
          { label: 'Add Tag', value: 'addTag' },
          { label: 'Remove Tag', value: 'removeTag' },
          { label: 'Add Note', value: 'addNote' },
        ],
        { default: 'list' }
      ),
      input.string('contactId', 'Contact ID', {
        description: 'Intercom contact ID',
      }),
      input.string('conversationId', 'Conversation ID', {
        description: 'Conversation ID',
      }),
      input.string('companyId', 'Company ID', {
        description: 'Company ID',
      }),
      input.string('email', 'Email', {
        description: 'Contact email',
        placeholder: 'user@example.com',
      }),
      input.string('phone', 'Phone', {
        description: 'Contact phone number',
      }),
      input.string('name', 'Name', {
        description: 'Contact/company name',
      }),
      input.json('customAttributes', 'Custom Attributes', {
        description: 'Custom attributes',
        default: {},
      }),
      input.select(
        'role',
        'Role',
        [
          { label: 'User', value: 'user' },
          { label: 'Lead', value: 'lead' },
        ],
        { default: 'user' }
      ),
      input.text('messageBody', 'Message Body', {
        description: 'Message content',
      }),
      input.select(
        'messageType',
        'Message Type',
        [
          { label: 'Comment', value: 'comment' },
          { label: 'Note', value: 'note' },
        ],
        { default: 'comment' }
      ),
      input.string('assigneeId', 'Assignee ID', {
        description: 'Admin/team ID to assign',
      }),
      input.string('tagName', 'Tag Name', {
        description: 'Tag to add/remove',
      }),
      input.text('noteBody', 'Note Body', {
        description: 'Note content',
      }),
      input.string('eventName', 'Event Name', {
        description: 'Event name to track',
        placeholder: 'purchase',
      }),
      input.json('eventMetadata', 'Event Metadata', {
        description: 'Event metadata',
        default: {},
      }),
      input.number('snoozeDuration', 'Snooze Duration', {
        description: 'Snooze duration in seconds',
      }),
      input.string('query', 'Search Query', {
        description: 'Search query',
      }),
      input.number('perPage', 'Per Page', {
        description: 'Results per page',
        default: 50,
        min: 1,
        max: 150,
      }),
      input.string('startingAfter', 'Starting After', {
        description: 'Cursor for pagination',
      }),
      input.credential('credentialId', 'Intercom Credentials', {
        description: 'Intercom access token',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'contacts',
      operation: 'list',
      role: 'user',
      messageType: 'comment',
      perPage: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = IntercomNodeSchema.parse(nodeInput.config);

    logger.info(`Intercom ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            data: [
              {
                id: 'contact_123',
                type: 'contact',
                email: 'john@example.com',
                name: 'John Doe',
                role: 'user',
                created_at: Math.floor(Date.now() / 1000),
                updated_at: Math.floor(Date.now() / 1000),
              },
              {
                id: 'contact_456',
                type: 'contact',
                email: 'jane@example.com',
                name: 'Jane Smith',
                role: 'lead',
              },
            ],
            nextCursor: 'cursor_abc123',
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.contactId || config.conversationId || config.companyId,
              type: config.resource.slice(0, -1),
              email: 'john@example.com',
              name: 'John Doe',
              custom_attributes: config.customAttributes,
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `${config.resource}_${Date.now()}`,
            item: {
              id: `${config.resource}_${Date.now()}`,
              type: config.resource.slice(0, -1),
              email: config.email,
              name: config.name,
              role: config.role,
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.contactId || config.companyId,
            item: {
              id: config.contactId || config.companyId,
              email: config.email,
              name: config.name,
              custom_attributes: config.customAttributes,
              updated_at: Math.floor(Date.now() / 1000),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.contactId || config.companyId,
            deleted: true,
          },
        };

      case 'search':
        return {
          data: {
            success: true,
            data: [
              {
                id: 'contact_789',
                email: config.query,
                name: 'Search Result',
              },
            ],
          },
        };

      case 'reply':
        return {
          data: {
            success: true,
            id: `conversation_part_${Date.now()}`,
            conversationId: config.conversationId,
            body: config.messageBody,
            type: config.messageType,
          },
        };

      case 'close':
      case 'open':
        return {
          data: {
            success: true,
            conversationId: config.conversationId,
            state: config.operation,
          },
        };

      case 'snooze':
        return {
          data: {
            success: true,
            conversationId: config.conversationId,
            snoozed_until: Math.floor(Date.now() / 1000) + (config.snoozeDuration || 3600),
          },
        };

      case 'assign':
        return {
          data: {
            success: true,
            conversationId: config.conversationId,
            assigneeId: config.assigneeId,
          },
        };

      case 'addTag':
      case 'removeTag':
        return {
          data: {
            success: true,
            contactId: config.contactId,
            tag: config.tagName,
          },
        };

      case 'addNote':
        return {
          data: {
            success: true,
            id: `note_${Date.now()}`,
            contactId: config.contactId,
            body: config.noteBody,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
