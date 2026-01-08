import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TrelloNodeSchema = z.object({
  resource: z.enum(['cards', 'boards', 'lists', 'members', 'labels', 'checklists', 'comments']).default('cards'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'move', 'archive', 'addLabel', 'removeLabel', 'addMember', 'removeMember', 'addComment'
  ]).default('list'),
  cardId: z.string().optional(),
  boardId: z.string().optional(),
  listId: z.string().optional(),
  name: z.string().optional(),
  desc: z.string().optional(),
  pos: z.enum(['top', 'bottom']).optional(),
  due: z.string().optional(),
  dueComplete: z.boolean().optional(),
  idMembers: z.array(z.string()).optional(),
  idLabels: z.array(z.string()).optional(),
  targetListId: z.string().optional(),
  commentText: z.string().optional(),
  closed: z.boolean().optional(),
  credentialId: z.string().optional(),
});

export type TrelloNodeConfig = z.infer<typeof TrelloNodeSchema>;

export const trelloNode: NodeDefinition = createNode(
  {
    type: 'integration.trello',
    category: 'integration',
    name: 'Trello',
    description: 'Kanban boards - Cards, boards, lists, checklists',
    icon: 'Trello',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Cards', value: 'cards' },
          { label: 'Boards', value: 'boards' },
          { label: 'Lists', value: 'lists' },
          { label: 'Members', value: 'members' },
          { label: 'Labels', value: 'labels' },
          { label: 'Checklists', value: 'checklists' },
          { label: 'Comments', value: 'comments' },
        ],
        { default: 'cards' }
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
          { label: 'Move Card', value: 'move' },
          { label: 'Archive', value: 'archive' },
          { label: 'Add Label', value: 'addLabel' },
          { label: 'Remove Label', value: 'removeLabel' },
          { label: 'Add Member', value: 'addMember' },
          { label: 'Remove Member', value: 'removeMember' },
          { label: 'Add Comment', value: 'addComment' },
        ],
        { default: 'list' }
      ),
      input.string('cardId', 'Card ID', {
        description: 'Trello card ID',
        placeholder: '5f4d3c2b1a...',
      }),
      input.string('boardId', 'Board ID', {
        description: 'Trello board ID',
        placeholder: '5f4d3c2b1a...',
      }),
      input.string('listId', 'List ID', {
        description: 'Trello list ID',
        placeholder: '5f4d3c2b1a...',
      }),
      input.string('name', 'Name', {
        description: 'Card/board/list name',
        placeholder: 'My Card',
      }),
      input.text('desc', 'Description', {
        description: 'Card description (supports Markdown)',
      }),
      input.select(
        'pos',
        'Position',
        [
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
        ],
        { default: 'bottom' }
      ),
      input.string('due', 'Due Date', {
        description: 'Due date (ISO 8601)',
        placeholder: '2024-12-31T23:59:59.000Z',
      }),
      input.boolean('dueComplete', 'Due Complete', {
        description: 'Mark due date as complete',
        default: false,
      }),
      input.json('idMembers', 'Member IDs', {
        description: 'Array of member IDs to assign',
        default: [],
      }),
      input.json('idLabels', 'Label IDs', {
        description: 'Array of label IDs to add',
        default: [],
      }),
      input.string('targetListId', 'Target List ID', {
        description: 'List ID to move card to',
      }),
      input.text('commentText', 'Comment Text', {
        description: 'Comment to add to card',
      }),
      input.boolean('closed', 'Archived', {
        description: 'Archive/unarchive the card',
        default: false,
      }),
      input.credential('credentialId', 'Trello Credentials', {
        description: 'Trello API key and token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'cards',
      operation: 'list',
      pos: 'bottom',
      dueComplete: false,
      closed: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = TrelloNodeSchema.parse(nodeInput.config);

    logger.info(`Trello ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: '5f4d3c2b1a0000',
                name: 'Implement feature X',
                desc: 'Description here',
                closed: false,
                due: '2024-12-31T23:59:59.000Z',
                dueComplete: false,
                idBoard: config.boardId || '5f4d3c2b1a0001',
                idList: config.listId || '5f4d3c2b1a0002',
                url: 'https://trello.com/c/abc123',
                labels: [{ id: 'label1', name: 'Bug', color: 'red' }],
              },
              {
                id: '5f4d3c2b1a0003',
                name: 'Fix bug Y',
                desc: 'Bug description',
                closed: false,
                idBoard: config.boardId || '5f4d3c2b1a0001',
                idList: config.listId || '5f4d3c2b1a0002',
                url: 'https://trello.com/c/def456',
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.cardId || config.boardId || config.listId,
              name: 'Implement feature X',
              desc: 'Description here',
              closed: false,
              due: '2024-12-31T23:59:59.000Z',
              url: `https://trello.com/c/${config.cardId}`,
              dateLastActivity: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `${Date.now().toString(36)}`,
            item: {
              id: `${Date.now().toString(36)}`,
              name: config.name,
              desc: config.desc,
              idList: config.listId,
              url: `https://trello.com/c/${Date.now().toString(36)}`,
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.cardId,
            item: {
              id: config.cardId,
              name: config.name,
              desc: config.desc,
              closed: config.closed,
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.cardId || config.boardId || config.listId,
            deleted: true,
          },
        };

      case 'move':
        return {
          data: {
            success: true,
            id: config.cardId,
            idList: config.targetListId,
            moved: true,
          },
        };

      case 'archive':
        return {
          data: {
            success: true,
            id: config.cardId,
            closed: true,
            archived: true,
          },
        };

      case 'addLabel':
      case 'removeLabel':
        return {
          data: {
            success: true,
            id: config.cardId,
            labels: config.idLabels,
          },
        };

      case 'addMember':
      case 'removeMember':
        return {
          data: {
            success: true,
            id: config.cardId,
            members: config.idMembers,
          },
        };

      case 'addComment':
        return {
          data: {
            success: true,
            id: `comment_${Date.now()}`,
            cardId: config.cardId,
            text: config.commentText,
            date: new Date().toISOString(),
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
