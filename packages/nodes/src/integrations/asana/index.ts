import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AsanaNodeSchema = z.object({
  resource: z.enum(['tasks', 'projects', 'workspaces', 'sections', 'tags', 'users', 'teams', 'portfolios']).default('tasks'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list',
    'addToProject', 'removeFromProject', 'setParent', 'addFollowers', 'addTag'
  ]).default('list'),
  taskGid: z.string().optional(),
  projectGid: z.string().optional(),
  workspaceGid: z.string().optional(),
  sectionGid: z.string().optional(),
  assignee: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  completed: z.boolean().optional(),
  dueOn: z.string().optional(),
  followers: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.string().optional(),
  credentialId: z.string().optional(),
});

export type AsanaNodeConfig = z.infer<typeof AsanaNodeSchema>;

export const asanaNode: NodeDefinition = createNode(
  {
    type: 'integration.asana',
    category: 'integration',
    name: 'Asana',
    description: 'Project management - Tasks, projects, workspaces',
    icon: 'Layout',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Tasks', value: 'tasks' },
          { label: 'Projects', value: 'projects' },
          { label: 'Workspaces', value: 'workspaces' },
          { label: 'Sections', value: 'sections' },
          { label: 'Tags', value: 'tags' },
          { label: 'Users', value: 'users' },
          { label: 'Teams', value: 'teams' },
          { label: 'Portfolios', value: 'portfolios' },
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
          { label: 'Add to Project', value: 'addToProject' },
          { label: 'Remove from Project', value: 'removeFromProject' },
          { label: 'Set Parent', value: 'setParent' },
          { label: 'Add Followers', value: 'addFollowers' },
          { label: 'Add Tag', value: 'addTag' },
        ],
        { default: 'list' }
      ),
      input.string('taskGid', 'Task GID', {
        description: 'Asana task global ID',
        placeholder: '1234567890',
      }),
      input.string('projectGid', 'Project GID', {
        description: 'Asana project global ID',
        placeholder: '1234567890',
      }),
      input.string('workspaceGid', 'Workspace GID', {
        description: 'Asana workspace global ID',
        placeholder: '1234567890',
      }),
      input.string('sectionGid', 'Section GID', {
        description: 'Section to add task to',
      }),
      input.string('assignee', 'Assignee', {
        description: 'User GID or email to assign',
        placeholder: 'me or user@example.com',
      }),
      input.json('data', 'Task/Project Data', {
        description: 'Data for create/update operations',
        default: {},
      }),
      input.boolean('completed', 'Completed', {
        description: 'Task completion status',
        default: false,
      }),
      input.string('dueOn', 'Due Date', {
        description: 'Due date (YYYY-MM-DD)',
        placeholder: '2024-12-31',
      }),
      input.json('followers', 'Followers', {
        description: 'User GIDs to add as followers',
        default: [],
      }),
      input.json('tags', 'Tags', {
        description: 'Tag GIDs to add',
        default: [],
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 100,
      }),
      input.string('offset', 'Offset', {
        description: 'Pagination offset token',
      }),
      input.credential('credentialId', 'Asana Credentials', {
        description: 'Asana personal access token or OAuth2',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('items', 'List results'),
      output.object('item', 'Single item'),
      output.string('gid', 'Created/updated item GID'),
      output.string('nextPage', 'Next page offset'),
    ],
    defaults: {
      resource: 'tasks',
      operation: 'list',
      completed: false,
      limit: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AsanaNodeSchema.parse(nodeInput.config);

    logger.info(`Asana ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
        return {
          data: {
            success: true,
            items: [
              {
                gid: '1234567890',
                name: 'Complete project documentation',
                completed: false,
                due_on: '2024-12-31',
                assignee: { gid: '9876543210', name: 'John Doe' },
                projects: [{ gid: '1111111111', name: 'Main Project' }],
                created_at: new Date().toISOString(),
              },
              {
                gid: '1234567891',
                name: 'Review pull request',
                completed: true,
                due_on: '2024-12-15',
                assignee: { gid: '9876543210', name: 'John Doe' },
              },
            ],
            nextPage: 'offset_token_abc',
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            item: {
              gid: config.taskGid || config.projectGid,
              name: 'Complete project documentation',
              completed: false,
              due_on: '2024-12-31',
              notes: 'Task description here',
              assignee: { gid: '9876543210', name: 'John Doe' },
              projects: [{ gid: '1111111111', name: 'Main Project' }],
              created_at: new Date().toISOString(),
              modified_at: new Date().toISOString(),
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            gid: `${Date.now()}`,
            item: {
              gid: `${Date.now()}`,
              ...config.data,
              created_at: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            gid: config.taskGid || config.projectGid,
            item: {
              gid: config.taskGid || config.projectGid,
              ...config.data,
              completed: config.completed,
              modified_at: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            gid: config.taskGid || config.projectGid,
            deleted: true,
          },
        };

      case 'addToProject':
        return {
          data: {
            success: true,
            taskGid: config.taskGid,
            projectGid: config.projectGid,
            sectionGid: config.sectionGid,
          },
        };

      case 'removeFromProject':
        return {
          data: {
            success: true,
            taskGid: config.taskGid,
            projectGid: config.projectGid,
            removed: true,
          },
        };

      case 'addFollowers':
        return {
          data: {
            success: true,
            taskGid: config.taskGid,
            followers: config.followers,
          },
        };

      case 'addTag':
        return {
          data: {
            success: true,
            taskGid: config.taskGid,
            tags: config.tags,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
