import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const LinearNodeSchema = z.object({
  resource: z.enum(['issues', 'projects', 'cycles', 'teams', 'users', 'comments', 'labels', 'workflows']).default('issues'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'addComment', 'archive', 'changeState', 'assignUser'
  ]).default('list'),
  issueId: z.string().optional(),
  projectId: z.string().optional(),
  teamId: z.string().optional(),
  cycleId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.number().min(0).max(4).optional(),
  stateId: z.string().optional(),
  assigneeId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  estimate: z.number().optional(),
  dueDate: z.string().optional(),
  commentBody: z.string().optional(),
  filter: z.record(z.unknown()).optional(),
  first: z.number().min(1).max(250).default(50),
  after: z.string().optional(),
  credentialId: z.string().optional(),
});

export type LinearNodeConfig = z.infer<typeof LinearNodeSchema>;

export const linearNode: NodeDefinition = createNode(
  {
    type: 'integration.linear',
    category: 'integration',
    name: 'Linear',
    description: 'Modern issue tracking - Issues, cycles, projects, teams',
    icon: 'Layers',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Issues', value: 'issues' },
          { label: 'Projects', value: 'projects' },
          { label: 'Cycles', value: 'cycles' },
          { label: 'Teams', value: 'teams' },
          { label: 'Users', value: 'users' },
          { label: 'Comments', value: 'comments' },
          { label: 'Labels', value: 'labels' },
          { label: 'Workflows', value: 'workflows' },
        ],
        { default: 'issues' }
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
          { label: 'Archive', value: 'archive' },
          { label: 'Change State', value: 'changeState' },
          { label: 'Assign User', value: 'assignUser' },
        ],
        { default: 'list' }
      ),
      input.string('issueId', 'Issue ID', {
        description: 'Linear issue ID or identifier (e.g., ENG-123)',
        placeholder: 'ENG-123',
      }),
      input.string('projectId', 'Project ID', {
        description: 'Project ID',
      }),
      input.string('teamId', 'Team ID', {
        description: 'Team ID',
        required: true,
      }),
      input.string('cycleId', 'Cycle ID', {
        description: 'Cycle ID',
      }),
      input.string('title', 'Title', {
        description: 'Issue title',
        placeholder: 'Issue title',
      }),
      input.text('description', 'Description', {
        description: 'Issue description (supports Markdown)',
      }),
      input.select(
        'priority',
        'Priority',
        [
          { label: 'No Priority', value: 0 },
          { label: 'Urgent', value: 1 },
          { label: 'High', value: 2 },
          { label: 'Medium', value: 3 },
          { label: 'Low', value: 4 },
        ],
        { default: 0 }
      ),
      input.string('stateId', 'State ID', {
        description: 'Workflow state ID',
      }),
      input.string('assigneeId', 'Assignee ID', {
        description: 'User ID to assign',
      }),
      input.json('labelIds', 'Label IDs', {
        description: 'Array of label IDs',
        default: [],
      }),
      input.number('estimate', 'Estimate', {
        description: 'Point estimate',
      }),
      input.string('dueDate', 'Due Date', {
        description: 'Due date (YYYY-MM-DD)',
        placeholder: '2024-12-31',
      }),
      input.text('commentBody', 'Comment', {
        description: 'Comment text (supports Markdown)',
      }),
      input.json('filter', 'Filter', {
        description: 'GraphQL filter object',
        default: {},
      }),
      input.number('first', 'Limit', {
        description: 'Maximum results',
        default: 50,
        min: 1,
        max: 250,
      }),
      input.string('after', 'After Cursor', {
        description: 'Pagination cursor',
      }),
      input.credential('credentialId', 'Linear Credentials', {
        description: 'Linear API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('nodes', 'List results'),
      output.object('node', 'Single item'),
      output.string('id', 'Created/updated item ID'),
      output.string('identifier', 'Issue identifier (e.g., ENG-123)'),
      output.string('endCursor', 'Pagination cursor'),
      output.boolean('hasNextPage', 'Has more results'),
    ],
    defaults: {
      resource: 'issues',
      operation: 'list',
      priority: 0,
      first: 50,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = LinearNodeSchema.parse(nodeInput.config);

    logger.info(`Linear ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
      case 'search':
        return {
          data: {
            success: true,
            nodes: [
              {
                id: 'issue_123',
                identifier: 'ENG-123',
                title: 'Implement authentication',
                description: 'Add OAuth2 authentication',
                priority: 2,
                state: { id: 'state_1', name: 'In Progress', color: '#0000ff' },
                assignee: { id: 'user_1', name: 'John Doe', email: 'john@example.com' },
                team: { id: 'team_1', name: 'Engineering', key: 'ENG' },
                project: { id: 'project_1', name: 'Q4 Goals' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              {
                id: 'issue_124',
                identifier: 'ENG-124',
                title: 'Fix performance issue',
                priority: 1,
                state: { id: 'state_2', name: 'Todo', color: '#888888' },
              },
            ],
            endCursor: 'cursor_abc123',
            hasNextPage: true,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            node: {
              id: config.issueId,
              identifier: config.issueId,
              title: 'Implement authentication',
              description: 'Add OAuth2 authentication',
              priority: 2,
              state: { id: 'state_1', name: 'In Progress' },
              assignee: { id: 'user_1', name: 'John Doe' },
              labels: { nodes: [{ id: 'label_1', name: 'bug', color: '#ff0000' }] },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'create':
        const identifier = `ENG-${Math.floor(Math.random() * 1000)}`;
        return {
          data: {
            success: true,
            id: `issue_${Date.now()}`,
            identifier,
            node: {
              id: `issue_${Date.now()}`,
              identifier,
              title: config.title,
              description: config.description,
              priority: config.priority,
              createdAt: new Date().toISOString(),
            },
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            id: config.issueId,
            node: {
              id: config.issueId,
              title: config.title,
              description: config.description,
              priority: config.priority,
              updatedAt: new Date().toISOString(),
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            id: config.issueId,
            deleted: true,
          },
        };

      case 'addComment':
        return {
          data: {
            success: true,
            id: `comment_${Date.now()}`,
            issueId: config.issueId,
            body: config.commentBody,
            createdAt: new Date().toISOString(),
          },
        };

      case 'archive':
        return {
          data: {
            success: true,
            id: config.issueId,
            archivedAt: new Date().toISOString(),
          },
        };

      case 'changeState':
        return {
          data: {
            success: true,
            id: config.issueId,
            stateId: config.stateId,
          },
        };

      case 'assignUser':
        return {
          data: {
            success: true,
            id: config.issueId,
            assigneeId: config.assigneeId,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
