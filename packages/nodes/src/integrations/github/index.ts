import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GithubSchema = z.object({
  operation: z.enum(['createIssue', 'getIssue', 'listIssues', 'createPR', 'getPR', 'createComment', 'getRepo']).default('listIssues'),
  owner: z.string(),
  repo: z.string(),
  issueNumber: z.number().optional(),
  prNumber: z.number().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  head: z.string().optional(),
  base: z.string().optional(),
});

export const githubNode: NodeDefinition = createNode(
  {
    type: 'integration.github',
    category: 'integration',
    name: 'GitHub',
    description: 'Interact with GitHub repositories, issues, and PRs',
    icon: 'Github',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Create Issue', value: 'createIssue' },
        { label: 'Get Issue', value: 'getIssue' },
        { label: 'List Issues', value: 'listIssues' },
        { label: 'Create Pull Request', value: 'createPR' },
        { label: 'Get Pull Request', value: 'getPR' },
        { label: 'Create Comment', value: 'createComment' },
        { label: 'Get Repository', value: 'getRepo' },
      ], { default: 'listIssues' }),
      input.string('owner', 'Owner', { required: true, description: 'Repository owner' }),
      input.string('repo', 'Repository', { required: true, description: 'Repository name' }),
      input.number('issueNumber', 'Issue Number', { description: 'Issue number' }),
      input.number('prNumber', 'PR Number', { description: 'Pull request number' }),
      input.string('title', 'Title', { description: 'Issue/PR title' }),
      input.string('body', 'Body', { description: 'Issue/PR body' }),
      input.json('labels', 'Labels', { description: 'Labels array' }),
      input.string('head', 'Head Branch', { description: 'PR head branch' }),
      input.string('base', 'Base Branch', { description: 'PR base branch', default: 'main' }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GithubSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`GitHub: ${config.operation}`);

    if (!credentials?.apiKey) {
      throw new Error('GitHub token is required');
    }

    const baseUrl = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, unknown> | undefined;

    switch (config.operation) {
      case 'listIssues':
        endpoint = `/repos/${config.owner}/${config.repo}/issues`;
        break;
      case 'getIssue':
        endpoint = `/repos/${config.owner}/${config.repo}/issues/${config.issueNumber}`;
        break;
      case 'createIssue':
        endpoint = `/repos/${config.owner}/${config.repo}/issues`;
        method = 'POST';
        body = { title: config.title, body: config.body, labels: config.labels, assignees: config.assignees };
        break;
      case 'createPR':
        endpoint = `/repos/${config.owner}/${config.repo}/pulls`;
        method = 'POST';
        body = { title: config.title, body: config.body, head: config.head, base: config.base };
        break;
      case 'getPR':
        endpoint = `/repos/${config.owner}/${config.repo}/pulls/${config.prNumber}`;
        break;
      case 'createComment':
        endpoint = `/repos/${config.owner}/${config.repo}/issues/${config.issueNumber}/comments`;
        method = 'POST';
        body = { body: config.body };
        break;
      case 'getRepo':
        endpoint = `/repos/${config.owner}/${config.repo}`;
        break;
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json() as Record<string, unknown> & { message?: string };

    if (!response.ok) {
      throw new Error(`GitHub API error: ${result.message}`);
    }

    return { data: result };
  }
);
