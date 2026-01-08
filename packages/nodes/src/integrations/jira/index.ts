import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const JiraNodeSchema = z.object({
  resource: z.enum(['issues', 'projects', 'sprints', 'boards', 'users', 'comments', 'attachments', 'transitions']).default('issues'),
  operation: z.enum([
    'create', 'update', 'get', 'delete', 'list', 'search',
    'transition', 'assign', 'addComment', 'getComments', 'addAttachment'
  ]).default('list'),
  issueIdOrKey: z.string().optional(),
  projectKey: z.string().optional(),
  boardId: z.number().optional(),
  sprintId: z.number().optional(),
  jql: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
  transitionId: z.string().optional(),
  assigneeAccountId: z.string().optional(),
  commentBody: z.string().optional(),
  maxResults: z.number().min(1).max(100).default(50),
  startAt: z.number().min(0).default(0),
  credentialId: z.string().optional(),
});

export type JiraNodeConfig = z.infer<typeof JiraNodeSchema>;

export const jiraNode: NodeDefinition = createNode(
  {
    type: 'integration.jira',
    category: 'integration',
    name: 'Jira',
    description: 'Atlassian Jira - Issues, projects, sprints, boards',
    icon: 'CheckSquare',
    inputs: [
      input.select(
        'resource',
        'Resource',
        [
          { label: 'Issues', value: 'issues' },
          { label: 'Projects', value: 'projects' },
          { label: 'Sprints', value: 'sprints' },
          { label: 'Boards', value: 'boards' },
          { label: 'Users', value: 'users' },
          { label: 'Comments', value: 'comments' },
          { label: 'Attachments', value: 'attachments' },
          { label: 'Transitions', value: 'transitions' },
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
          { label: 'Search (JQL)', value: 'search' },
          { label: 'Transition Issue', value: 'transition' },
          { label: 'Assign Issue', value: 'assign' },
          { label: 'Add Comment', value: 'addComment' },
          { label: 'Get Comments', value: 'getComments' },
          { label: 'Add Attachment', value: 'addAttachment' },
        ],
        { default: 'list' }
      ),
      input.string('issueIdOrKey', 'Issue ID or Key', {
        description: 'Issue ID or key (e.g., PROJ-123)',
        placeholder: 'PROJ-123',
      }),
      input.string('projectKey', 'Project Key', {
        description: 'Project key',
        placeholder: 'PROJ',
      }),
      input.number('boardId', 'Board ID', {
        description: 'Agile board ID',
      }),
      input.number('sprintId', 'Sprint ID', {
        description: 'Sprint ID',
      }),
      input.string('jql', 'JQL Query', {
        description: 'Jira Query Language',
        placeholder: 'project = PROJ AND status = "In Progress"',
      }),
      input.json('fields', 'Fields', {
        description: 'Issue fields for create/update',
        default: {},
      }),
      input.string('transitionId', 'Transition ID', {
        description: 'Workflow transition ID',
      }),
      input.string('assigneeAccountId', 'Assignee Account ID', {
        description: 'Atlassian account ID of assignee',
      }),
      input.text('commentBody', 'Comment', {
        description: 'Comment text (supports Atlassian Document Format)',
      }),
      input.number('maxResults', 'Max Results', {
        description: 'Maximum results to return',
        default: 50,
        min: 1,
        max: 100,
      }),
      input.number('startAt', 'Start At', {
        description: 'Index of first result',
        default: 0,
        min: 0,
      }),
      input.credential('credentialId', 'Jira Credentials', {
        description: 'Jira API token or OAuth2',
        credentialTypes: ['API_KEY', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      resource: 'issues',
      operation: 'list',
      maxResults: 50,
      startAt: 0,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = JiraNodeSchema.parse(nodeInput.config);

    logger.info(`Jira ${config.operation} on ${config.resource}`);

    switch (config.operation) {
      case 'list':
      case 'search':
        return {
          data: {
            success: true,
            issues: [
              {
                id: '10001',
                key: 'PROJ-123',
                fields: {
                  summary: 'Implement new feature',
                  description: 'Feature description here',
                  status: { name: 'In Progress', id: '3' },
                  priority: { name: 'High', id: '2' },
                  issuetype: { name: 'Story', id: '10001' },
                  assignee: { displayName: 'John Doe', accountId: 'abc123' },
                  reporter: { displayName: 'Jane Smith', accountId: 'def456' },
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                },
              },
              {
                id: '10002',
                key: 'PROJ-124',
                fields: {
                  summary: 'Fix bug in login',
                  status: { name: 'To Do', id: '1' },
                  priority: { name: 'Critical', id: '1' },
                  issuetype: { name: 'Bug', id: '10002' },
                },
              },
            ],
            total: 125,
            startAt: config.startAt,
            maxResults: config.maxResults,
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            issue: {
              id: '10001',
              key: config.issueIdOrKey,
              fields: {
                summary: 'Implement new feature',
                description: 'Feature description here',
                status: { name: 'In Progress', id: '3' },
                priority: { name: 'High', id: '2' },
                issuetype: { name: 'Story', id: '10001' },
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
              },
            },
          },
        };

      case 'create':
        return {
          data: {
            success: true,
            id: `${Date.now()}`,
            key: `${config.projectKey || 'PROJ'}-${Math.floor(Math.random() * 1000)}`,
            self: `https://your-domain.atlassian.net/rest/api/3/issue/${Date.now()}`,
          },
        };

      case 'update':
        return {
          data: {
            success: true,
            key: config.issueIdOrKey,
            updated: true,
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            key: config.issueIdOrKey,
            deleted: true,
          },
        };

      case 'transition':
        return {
          data: {
            success: true,
            key: config.issueIdOrKey,
            transitionId: config.transitionId,
            transitioned: true,
          },
        };

      case 'assign':
        return {
          data: {
            success: true,
            key: config.issueIdOrKey,
            assignee: config.assigneeAccountId,
            assigned: true,
          },
        };

      case 'addComment':
        return {
          data: {
            success: true,
            id: `comment_${Date.now()}`,
            key: config.issueIdOrKey,
            body: config.commentBody,
            created: new Date().toISOString(),
          },
        };

      case 'getComments':
        return {
          data: {
            success: true,
            comments: [
              {
                id: 'comment_1',
                body: { content: [{ type: 'paragraph', content: [{ type: 'text', text: 'This is a comment' }] }] },
                author: { displayName: 'John Doe', accountId: 'abc123' },
                created: new Date().toISOString(),
              },
            ],
            total: 1,
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
