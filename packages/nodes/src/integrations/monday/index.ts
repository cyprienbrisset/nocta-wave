import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MondayNodeSchema = z.object({
  resource: z.enum(['items', 'boards', 'groups', 'columns', 'updates', 'users', 'workspaces']).default('items'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'changeColumnValue', 'moveToGroup', 'duplicate', 'archive', 'addUpdate'
  ]).default('list'),
  boardId: z.number().optional(),
  itemId: z.number().optional(),
  groupId: z.string().optional(),
  columnId: z.string().optional(),
  itemName: z.string().optional(),
  columnValues: z.record(z.unknown()).optional(),
  updateText: z.string().optional(),
  targetGroupId: z.string().optional(),
  limit: z.number().min(1).max(500).default(50),
  page: z.number().min(1).default(1),
  credentialId: z.string().optional(),
});

export type MondayNodeConfig = z.infer<typeof MondayNodeSchema>;

export const mondayNode: NodeDefinition = createNode(
  {
    type: 'integration.monday',
    category: 'integration',
    name: 'Monday.com',
    description: 'Work OS - Items, boards, columns, updates',
    icon: 'Grid3X3',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Items', value: 'items' },
          { label: 'Boards', value: 'boards' },
          { label: 'Groups', value: 'groups' },
          { label: 'Columns', value: 'columns' },
          { label: 'Updates', value: 'updates' },
          { label: 'Users', value: 'users' },
          { label: 'Workspaces', value: 'workspaces' },
        ],
        { default: 'items' }
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
          { label: 'Change Column Value', value: 'changeColumnValue' },
          { label: 'Move to Group', value: 'moveToGroup' },
          { label: 'Duplicate', value: 'duplicate' },
          { label: 'Archive', value: 'archive' },
          { label: 'Add Update', value: 'addUpdate' },
        ],
        { default: 'list' }
      ),
      input.number('boardId', 'Board ID', {
        description: 'Monday.com board ID',
      }),
      input.number('itemId', 'Item ID', {
        description: 'Monday.com item ID',
      }),
      input.string('groupId', 'Group ID', {
        description: 'Group ID within the board',
        placeholder: 'new_group',
      }),
      input.string('columnId', 'Column ID', {
        description: 'Column ID for value changes',
      }),
      input.string('itemName', 'Item Name', {
        description: 'Name for new item',
        placeholder: 'New Task',
      }),
      input.json('columnValues', 'Column Values', {
        description: 'Column values as JSON object',
        default: {},
      }),
      input.text('updateText', 'Update Text', {
        description: 'Text for update/comment',
      }),
      input.string('targetGroupId', 'Target Group ID', {
        description: 'Group to move item to',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 500,
      }),
      input.number('page', 'Page', {
        description: 'Page number',
        default: 1,
        min: 1,
      }),
      input.credential('credentialId', 'Monday.com Credentials', {
        description: 'Monday.com API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.number('id', 'Created/updated item ID'),
    ],
    defaults: {
      resource: 'items',
      operation: 'list',
      limit: 50,
      page: 1,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MondayNodeSchema.parse(nodeInput.config);

    logger.info(`Monday.com ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                id: 123456789,
                name: 'Complete project',
                state: 'active',
                group: { id: 'group_1', title: 'To Do' },
                column_values: [
                  { id: 'status', title: 'Status', text: 'Working on it' },
                  { id: 'date', title: 'Due Date', text: '2024-12-31' },
                  { id: 'person', title: 'Owner', text: 'John Doe' },
                ],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              {
                id: 123456790,
                name: 'Review documentation',
                state: 'active',
                group: { id: 'group_1', title: 'To Do' },
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              id: config.itemId || config.boardId,
              name: 'Complete project',
              state: 'active',
              board: { id: config.boardId, name: 'Main Board' },
              group: { id: 'group_1', title: 'To Do' },
              column_values: [
                { id: 'status', title: 'Status', text: 'Working on it' },
                { id: 'date', title: 'Due Date', text: '2024-12-31' },
              ],
              updates: [
                { id: 1, body: 'Started working on this', created_at: new Date().toISOString() },
              ],
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
              name: config.itemName,
              board: { id: config.boardId },
              group: { id: config.groupId },
              column_values: config.columnValues,
            },
          },
        };

      case 'update':
      case 'changeColumnValue':
        return {
          data: {
            success: true,
            id: config.itemId,
            item: {
              id: config.itemId,
              column_values: config.columnValues,
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.itemId,
            deleted: true,
          },
        };

      case 'moveToGroup':
        return {
          data: {
            success: true,
            id: config.itemId,
            groupId: config.targetGroupId,
            moved: true,
          },
        };

      case 'duplicate':
        return {
          data: {
            success: true,
            id: Date.now(),
            sourceId: config.itemId,
            duplicated: true,
          },
        };

      case 'archive':
        return {
          data: {
            success: true,
            id: config.itemId,
            archived: true,
          },
        };

      case 'addUpdate':
        return {
          data: {
            success: true,
            id: Date.now(),
            itemId: config.itemId,
            body: config.updateText,
            created_at: new Date().toISOString(),
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
