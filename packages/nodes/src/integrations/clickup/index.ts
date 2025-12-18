import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ClickUpNodeSchema = z.object({
  resource: z.enum(['tasks', 'lists', 'folders', 'spaces', 'teams', 'comments', 'checklists', 'goals', 'tags']).default('tasks'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'addComment', 'addChecklist', 'addTag', 'removeTag', 'setDueDate', 'setAssignee'
  ]).default('list'),
  teamId: z.string().optional(),
  spaceId: z.string().optional(),
  folderId: z.string().optional(),
  listId: z.string().optional(),
  taskId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.number().min(1).max(4).optional(),
  dueDate: z.number().optional(),
  assignees: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.array(z.object({
    id: z.string(),
    value: z.unknown(),
  })).optional(),
  commentText: z.string().optional(),
  checklistName: z.string().optional(),
  checklistItems: z.array(z.string()).optional(),
  subtasks: z.boolean().default(true),
  page: z.number().min(0).default(0),
  credentialId: z.string().optional(),
});

export type ClickUpNodeConfig = z.infer<typeof ClickUpNodeSchema>;

export const clickupNode: NodeDefinition = createNode(
  {
    type: 'integration.clickup',
    category: 'integration',
    name: 'ClickUp',
    description: 'Productivity platform - Tasks, spaces, lists, goals',
    icon: 'MousePointer',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Tasks', value: 'tasks' },
          { label: 'Lists', value: 'lists' },
          { label: 'Folders', value: 'folders' },
          { label: 'Spaces', value: 'spaces' },
          { label: 'Teams', value: 'teams' },
          { label: 'Comments', value: 'comments' },
          { label: 'Checklists', value: 'checklists' },
          { label: 'Goals', value: 'goals' },
          { label: 'Tags', value: 'tags' },
        ],
        { default: 'tasks' }
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
          { label: 'Add Comment', value: 'addComment' },
          { label: 'Add Checklist', value: 'addChecklist' },
          { label: 'Add Tag', value: 'addTag' },
          { label: 'Remove Tag', value: 'removeTag' },
          { label: 'Set Due Date', value: 'setDueDate' },
          { label: 'Set Assignee', value: 'setAssignee' },
        ],
        { default: 'list' }
      ),
      input.string('teamId', 'Team ID', {
        description: 'ClickUp team/workspace ID',
      }),
      input.string('spaceId', 'Space ID', {
        description: 'Space ID',
      }),
      input.string('folderId', 'Folder ID', {
        description: 'Folder ID',
      }),
      input.string('listId', 'List ID', {
        description: 'List ID',
        required: true,
      }),
      input.string('taskId', 'Task ID', {
        description: 'Task ID',
      }),
      input.string('name', 'Name', {
        description: 'Task name',
        placeholder: 'New Task',
      }),
      input.text('description', 'Description', {
        description: 'Task description (supports Markdown)',
      }),
      input.string('status', 'Status', {
        description: 'Task status',
        placeholder: 'in progress',
      }),
      input.select(
        'priority',
        'Priority',
        [
          { label: 'Urgent', value: 1 },
          { label: 'High', value: 2 },
          { label: 'Normal', value: 3 },
          { label: 'Low', value: 4 },
        ],
        { default: 3 }
      ),
      input.number('dueDate', 'Due Date', {
        description: 'Due date as Unix timestamp (ms)',
      }),
      input.json('assignees', 'Assignees', {
        description: 'Array of user IDs to assign',
        default: [],
      }),
      input.json('tags', 'Tags', {
        description: 'Array of tag names',
        default: [],
      }),
      input.json('customFields', 'Custom Fields', {
        description: 'Custom field values',
        default: [],
      }),
      input.text('commentText', 'Comment Text', {
        description: 'Comment to add',
      }),
      input.string('checklistName', 'Checklist Name', {
        description: 'Name for new checklist',
      }),
      input.json('checklistItems', 'Checklist Items', {
        description: 'Array of checklist item names',
        default: [],
      }),
      input.boolean('subtasks', 'Include Subtasks', {
        description: 'Include subtasks in results',
        default: true,
      }),
      input.number('page', 'Page', {
        description: 'Page number (0-indexed)',
        default: 0,
        min: 0,
      }),
      input.credential('credentialId', 'ClickUp Credentials', {
        description: 'ClickUp API token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('tasks', 'List of tasks'),
      output.object('task', 'Single task'),
      output.string('id', 'Created/updated task ID'),
    ],
    defaults: {
      resource: 'tasks',
      operation: 'list',
      priority: 3,
      subtasks: true,
      page: 0,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ClickUpNodeSchema.parse(nodeInput.config);

    logger.info(`ClickUp ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            tasks: [
              {
                id: 'task_abc123',
                custom_id: null,
                name: 'Complete project documentation',
                text_content: 'Write comprehensive docs',
                description: 'Write comprehensive docs',
                status: { status: 'in progress', color: '#4194f6', type: 'custom' },
                priority: { id: '2', priority: 'high', color: '#f9d900' },
                assignees: [{ id: 123, username: 'johndoe', email: 'john@example.com' }],
                tags: [{ name: 'documentation', tag_fg: '#ffffff', tag_bg: '#000000' }],
                due_date: '1704067200000',
                date_created: new Date().toISOString(),
                date_updated: new Date().toISOString(),
                url: 'https://app.clickup.com/t/task_abc123',
              },
              {
                id: 'task_def456',
                name: 'Fix login bug',
                status: { status: 'to do', color: '#87909e' },
                priority: { id: '1', priority: 'urgent', color: '#f50000' },
              },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            task: {
              id: config.taskId,
              name: 'Complete project documentation',
              text_content: 'Write comprehensive docs',
              status: { status: 'in progress', color: '#4194f6' },
              priority: { id: '2', priority: 'high' },
              assignees: [{ id: 123, username: 'johndoe' }],
              checklists: [
                {
                  id: 'checklist_1',
                  name: 'Requirements',
                  items: [
                    { id: 'item_1', name: 'Write intro', resolved: true },
                    { id: 'item_2', name: 'Add examples', resolved: false },
                  ],
                },
              ],
              url: `https://app.clickup.com/t/${config.taskId}`,
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `task_${Date.now().toString(36)}`,
            task: {
              id: `task_${Date.now().toString(36)}`,
              name: config.name,
              description: config.description,
              status: { status: config.status || 'to do' },
              priority: config.priority ? { id: String(config.priority) } : null,
              url: `https://app.clickup.com/t/task_${Date.now().toString(36)}`,
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.taskId,
            task: {
              id: config.taskId,
              name: config.name,
              description: config.description,
              status: config.status ? { status: config.status } : undefined,
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.taskId,
            deleted: true,
          },
        };

      case 'addComment':
        return {
          data: {
            success: true,
            id: `comment_${Date.now()}`,
            taskId: config.taskId,
            comment_text: config.commentText,
            date: new Date().toISOString(),
          },
        };

      case 'addChecklist':
        return {
          data: {
            success: true,
            checklist: {
              id: `checklist_${Date.now()}`,
              name: config.checklistName,
              items: config.checklistItems?.map((item, i) => ({
                id: `item_${i}`,
                name: item,
                resolved: false,
              })),
            },
          },
        };

      case 'addTag':
      case 'removeTag':
        return {
          data: {
            success: true,
            taskId: config.taskId,
            tags: config.tags,
          },
        };

      case 'setDueDate':
        return {
          data: {
            success: true,
            taskId: config.taskId,
            due_date: config.dueDate,
          },
        };

      case 'setAssignee':
        return {
          data: {
            success: true,
            taskId: config.taskId,
            assignees: config.assignees,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
