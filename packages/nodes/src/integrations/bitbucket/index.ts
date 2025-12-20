import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const BitbucketSchema = z.object({
  operation: z.enum([
    // Repository operations
    'getRepository',
    'listRepositories',
    'createRepository',
    'deleteRepository',
    'forkRepository',
    // Branch operations
    'listBranches',
    'getBranch',
    'createBranch',
    'deleteBranch',
    // Pull Request operations
    'getPullRequest',
    'listPullRequests',
    'createPullRequest',
    'updatePullRequest',
    'mergePullRequest',
    'declinePullRequest',
    'approvePullRequest',
    'unaprovePullRequest',
    'requestChanges',
    // Commit operations
    'getCommit',
    'listCommits',
    'compare',
    // File operations
    'getFile',
    'createFile',
    'updateFile',
    'deleteFile',
    'listDirectory',
    // Issue operations (if enabled)
    'getIssue',
    'listIssues',
    'createIssue',
    'updateIssue',
    // Comment operations
    'listComments',
    'createComment',
    'updateComment',
    // Webhook operations
    'listWebhooks',
    'createWebhook',
    'deleteWebhook',
    // Pipeline operations
    'getPipeline',
    'listPipelines',
    'triggerPipeline',
    'stopPipeline',
    'getPipelineStep',
    'getPipelineLog',
    // Deployment operations
    'listDeployments',
    'getDeployment',
    // User/Team operations
    'getCurrentUser',
    'listWorkspaces',
    'getWorkspace',
    'listWorkspaceMembers',
    // Download operations
    'getArchive',
    'getDownloads',
    'createDownload',
  ]).default('listRepositories'),
  // Workspace and repository
  workspace: z.string(),
  repoSlug: z.string().optional(),
  // Pull request fields
  prId: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  sourceBranch: z.string().optional(),
  destinationBranch: z.string().optional(),
  closeSourceBranch: z.boolean().default(false),
  reviewers: z.array(z.object({
    uuid: z.string(),
  })).optional(),
  // Branch fields
  branchName: z.string().optional(),
  branchTarget: z.string().optional(),
  // Commit fields
  commitHash: z.string().optional(),
  // Compare fields
  spec: z.string().optional(),
  // File fields
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
  commitMessage: z.string().optional(),
  branch: z.string().optional(),
  // Issue fields
  issueId: z.number().optional(),
  priority: z.enum(['trivial', 'minor', 'major', 'critical', 'blocker']).optional(),
  kind: z.enum(['bug', 'enhancement', 'proposal', 'task']).optional(),
  state: z.enum(['new', 'open', 'resolved', 'on hold', 'invalid', 'duplicate', 'wontfix', 'closed']).optional(),
  assignee: z.string().optional(),
  component: z.string().optional(),
  version: z.string().optional(),
  milestone: z.string().optional(),
  // Comment fields
  commentId: z.number().optional(),
  commentContent: z.string().optional(),
  parentCommentId: z.number().optional(),
  inline: z.object({
    to: z.number().optional(),
    from: z.number().optional(),
    path: z.string(),
  }).optional(),
  // Webhook fields
  webhookUrl: z.string().optional(),
  webhookEvents: z.array(z.enum([
    'repo:push',
    'repo:fork',
    'repo:updated',
    'repo:commit_comment_created',
    'repo:commit_status_created',
    'repo:commit_status_updated',
    'issue:created',
    'issue:updated',
    'issue:comment_created',
    'pullrequest:created',
    'pullrequest:updated',
    'pullrequest:approved',
    'pullrequest:unapproved',
    'pullrequest:fulfilled',
    'pullrequest:rejected',
    'pullrequest:comment_created',
    'pullrequest:comment_updated',
    'pullrequest:comment_deleted',
  ])).optional(),
  webhookActive: z.boolean().default(true),
  webhookSecret: z.string().optional(),
  webhookUuid: z.string().optional(),
  // Pipeline fields
  pipelineUuid: z.string().optional(),
  stepUuid: z.string().optional(),
  pipelineTarget: z.object({
    type: z.enum(['pipeline_ref_target', 'pipeline_commit_target', 'pipeline_pullrequest_target']),
    ref_type: z.enum(['branch', 'tag', 'named_branch', 'bookmark']).optional(),
    ref_name: z.string().optional(),
    commit: z.object({ hash: z.string() }).optional(),
    pullrequest: z.object({ id: z.number() }).optional(),
    selector: z.object({
      type: z.string(),
      pattern: z.string(),
    }).optional(),
  }).optional(),
  pipelineVariables: z.array(z.object({
    key: z.string(),
    value: z.string(),
    secured: z.boolean().default(false),
  })).optional(),
  // Repository creation
  isPrivate: z.boolean().default(true),
  scm: z.enum(['git', 'hg']).default('git'),
  projectKey: z.string().optional(),
  forkPolicy: z.enum(['allow_forks', 'no_public_forks', 'no_forks']).optional(),
  language: z.string().optional(),
  hasIssues: z.boolean().default(false),
  hasWiki: z.boolean().default(false),
  // Pagination
  page: z.number().optional(),
  pagelen: z.number().min(1).max(100).default(25),
  // Filters
  query: z.string().optional(),
  sort: z.string().optional(),
  fields: z.string().optional(),
  // Download fields
  downloadFilename: z.string().optional(),
});

export const bitbucketNode: NodeDefinition = createNode(
  {
    type: 'integration.bitbucket',
    category: 'integration',
    name: 'Bitbucket',
    description: 'Complete Bitbucket Cloud integration - repositories, pull requests, pipelines, issues, and more',
    icon: 'GitBranch',
    inputs: [
      input.select('operation', 'Operation', [
        // Repositories
        { label: 'Get Repository', value: 'getRepository' },
        { label: 'List Repositories', value: 'listRepositories' },
        { label: 'Create Repository', value: 'createRepository' },
        { label: 'Delete Repository', value: 'deleteRepository' },
        { label: 'Fork Repository', value: 'forkRepository' },
        // Branches
        { label: 'List Branches', value: 'listBranches' },
        { label: 'Get Branch', value: 'getBranch' },
        { label: 'Create Branch', value: 'createBranch' },
        { label: 'Delete Branch', value: 'deleteBranch' },
        // Pull Requests
        { label: 'Get Pull Request', value: 'getPullRequest' },
        { label: 'List Pull Requests', value: 'listPullRequests' },
        { label: 'Create Pull Request', value: 'createPullRequest' },
        { label: 'Update Pull Request', value: 'updatePullRequest' },
        { label: 'Merge Pull Request', value: 'mergePullRequest' },
        { label: 'Decline Pull Request', value: 'declinePullRequest' },
        { label: 'Approve Pull Request', value: 'approvePullRequest' },
        { label: 'Request Changes', value: 'requestChanges' },
        // Commits
        { label: 'Get Commit', value: 'getCommit' },
        { label: 'List Commits', value: 'listCommits' },
        { label: 'Compare', value: 'compare' },
        // Files
        { label: 'Get File', value: 'getFile' },
        { label: 'Create File', value: 'createFile' },
        { label: 'Update File', value: 'updateFile' },
        { label: 'Delete File', value: 'deleteFile' },
        { label: 'List Directory', value: 'listDirectory' },
        // Issues
        { label: 'Get Issue', value: 'getIssue' },
        { label: 'List Issues', value: 'listIssues' },
        { label: 'Create Issue', value: 'createIssue' },
        { label: 'Update Issue', value: 'updateIssue' },
        // Comments
        { label: 'List Comments', value: 'listComments' },
        { label: 'Create Comment', value: 'createComment' },
        { label: 'Update Comment', value: 'updateComment' },
        // Webhooks
        { label: 'List Webhooks', value: 'listWebhooks' },
        { label: 'Create Webhook', value: 'createWebhook' },
        { label: 'Delete Webhook', value: 'deleteWebhook' },
        // Pipelines
        { label: 'Get Pipeline', value: 'getPipeline' },
        { label: 'List Pipelines', value: 'listPipelines' },
        { label: 'Trigger Pipeline', value: 'triggerPipeline' },
        { label: 'Stop Pipeline', value: 'stopPipeline' },
        { label: 'Get Pipeline Step', value: 'getPipelineStep' },
        { label: 'Get Pipeline Log', value: 'getPipelineLog' },
        // Deployments
        { label: 'List Deployments', value: 'listDeployments' },
        { label: 'Get Deployment', value: 'getDeployment' },
        // Users & Workspaces
        { label: 'Get Current User', value: 'getCurrentUser' },
        { label: 'List Workspaces', value: 'listWorkspaces' },
        { label: 'Get Workspace', value: 'getWorkspace' },
        { label: 'List Workspace Members', value: 'listWorkspaceMembers' },
        // Downloads
        { label: 'Get Archive', value: 'getArchive' },
      ], { default: 'listRepositories' }),
      input.string('workspace', 'Workspace', {
        required: true,
        description: 'Workspace ID (username for personal accounts)',
        placeholder: 'my-workspace',
      }),
      input.string('repoSlug', 'Repository Slug', {
        description: 'Repository slug (lowercase)',
        placeholder: 'my-repo',
      }),
      // Pull Request fields
      input.number('prId', 'Pull Request ID'),
      input.string('title', 'Title'),
      input.string('description', 'Description'),
      input.string('sourceBranch', 'Source Branch'),
      input.string('destinationBranch', 'Destination Branch', { default: 'main' }),
      input.boolean('closeSourceBranch', 'Close Source Branch on Merge', { default: false }),
      input.json('reviewers', 'Reviewers', {
        description: 'Array of reviewer UUIDs',
        placeholder: '[{"uuid": "{user-uuid}"}]',
      }),
      // Branch fields
      input.string('branchName', 'Branch Name'),
      input.string('branchTarget', 'Branch Target', {
        description: 'Commit hash or branch to create from',
      }),
      // Commit fields
      input.string('commitHash', 'Commit Hash'),
      input.string('spec', 'Compare Spec', {
        description: 'Comparison spec (e.g., "master..feature")',
        placeholder: 'main..feature-branch',
      }),
      // File fields
      input.string('filePath', 'File Path', { placeholder: 'src/config.json' }),
      input.code('fileContent', 'File Content', { language: 'text' }),
      input.string('commitMessage', 'Commit Message'),
      input.string('branch', 'Branch', { default: 'main' }),
      // Issue fields
      input.number('issueId', 'Issue ID'),
      input.select('priority', 'Priority', [
        { label: 'Trivial', value: 'trivial' },
        { label: 'Minor', value: 'minor' },
        { label: 'Major', value: 'major' },
        { label: 'Critical', value: 'critical' },
        { label: 'Blocker', value: 'blocker' },
      ]),
      input.select('kind', 'Issue Kind', [
        { label: 'Bug', value: 'bug' },
        { label: 'Enhancement', value: 'enhancement' },
        { label: 'Proposal', value: 'proposal' },
        { label: 'Task', value: 'task' },
      ]),
      input.select('state', 'Issue State', [
        { label: 'New', value: 'new' },
        { label: 'Open', value: 'open' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'On Hold', value: 'on hold' },
        { label: 'Closed', value: 'closed' },
      ]),
      input.string('assignee', 'Assignee', { description: 'Assignee username' }),
      // Comment fields
      input.number('commentId', 'Comment ID'),
      input.string('commentContent', 'Comment Content'),
      input.number('parentCommentId', 'Parent Comment ID', { description: 'For reply threading' }),
      input.json('inline', 'Inline Comment', {
        description: 'For inline code comments',
        placeholder: '{"path": "src/file.js", "to": 42}',
      }),
      // Webhook fields
      input.string('webhookUrl', 'Webhook URL'),
      input.json('webhookEvents', 'Webhook Events', {
        description: 'Events to trigger the webhook',
        placeholder: '["repo:push", "pullrequest:created"]',
      }),
      input.boolean('webhookActive', 'Webhook Active', { default: true }),
      input.string('webhookSecret', 'Webhook Secret'),
      input.string('webhookUuid', 'Webhook UUID'),
      // Pipeline fields
      input.string('pipelineUuid', 'Pipeline UUID'),
      input.string('stepUuid', 'Step UUID'),
      input.json('pipelineTarget', 'Pipeline Target', {
        description: 'Pipeline trigger target',
        placeholder: '{"type": "pipeline_ref_target", "ref_type": "branch", "ref_name": "main"}',
      }),
      input.json('pipelineVariables', 'Pipeline Variables', {
        placeholder: '[{"key": "DEPLOY_ENV", "value": "staging"}]',
      }),
      // Repository creation
      input.boolean('isPrivate', 'Private Repository', { default: true }),
      input.select('scm', 'SCM Type', [
        { label: 'Git', value: 'git' },
        { label: 'Mercurial', value: 'hg' },
      ], { default: 'git' }),
      input.string('projectKey', 'Project Key'),
      input.select('forkPolicy', 'Fork Policy', [
        { label: 'Allow Forks', value: 'allow_forks' },
        { label: 'No Public Forks', value: 'no_public_forks' },
        { label: 'No Forks', value: 'no_forks' },
      ]),
      input.boolean('hasIssues', 'Enable Issues', { default: false }),
      input.boolean('hasWiki', 'Enable Wiki', { default: false }),
      // Pagination
      input.number('page', 'Page', { default: 1 }),
      input.number('pagelen', 'Page Length', { default: 25 }),
      // Filters
      input.string('query', 'Query', { description: 'Filter query string' }),
      input.string('sort', 'Sort', { description: 'Sort field' }),
      input.string('fields', 'Fields', { description: 'Fields to include (partial response)' }),
    ],
    outputs: [
      output.object('result', 'Bitbucket API response'),
      output.array('values', 'List values (for paginated responses)'),
      output.object('page', 'Pagination info'),
      output.object('error', 'Error details if operation failed'),
    ],
    credentials: ['api_key', 'oauth2'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = BitbucketSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`Bitbucket: ${config.operation}`);

    if (!credentials?.apiKey && !credentials?.accessToken) {
      throw new Error('Bitbucket credentials required (App Password or OAuth token)');
    }

    const baseUrl = 'https://api.bitbucket.org/2.0';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // App passwords use Basic auth, OAuth uses Bearer
    if (credentials.accessToken) {
      headers['Authorization'] = `Bearer ${credentials.accessToken}`;
    } else if (credentials.username && credentials.apiKey) {
      const auth = Buffer.from(`${credentials.username}:${credentials.apiKey}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }

    const { workspace, repoSlug } = config;
    const repoPath = repoSlug ? `${workspace}/${repoSlug}` : workspace;

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, unknown> | undefined;

    switch (config.operation) {
      // Repositories
      case 'getRepository':
        endpoint = `/repositories/${repoPath}`;
        break;
      case 'listRepositories':
        endpoint = `/repositories/${workspace}?pagelen=${config.pagelen}`;
        if (config.query) endpoint += `&q=${encodeURIComponent(config.query)}`;
        break;
      case 'createRepository':
        endpoint = `/repositories/${repoPath}`;
        method = 'POST';
        body = {
          scm: config.scm,
          is_private: config.isPrivate,
          name: config.title,
          description: config.description,
          fork_policy: config.forkPolicy,
          has_issues: config.hasIssues,
          has_wiki: config.hasWiki,
          project: config.projectKey ? { key: config.projectKey } : undefined,
        };
        break;
      case 'deleteRepository':
        endpoint = `/repositories/${repoPath}`;
        method = 'DELETE';
        break;
      case 'forkRepository':
        endpoint = `/repositories/${repoPath}/forks`;
        method = 'POST';
        body = { name: config.title };
        break;

      // Branches
      case 'listBranches':
        endpoint = `/repositories/${repoPath}/refs/branches?pagelen=${config.pagelen}`;
        break;
      case 'getBranch':
        endpoint = `/repositories/${repoPath}/refs/branches/${encodeURIComponent(config.branchName || '')}`;
        break;
      case 'createBranch':
        endpoint = `/repositories/${repoPath}/refs/branches`;
        method = 'POST';
        body = {
          name: config.branchName,
          target: { hash: config.branchTarget },
        };
        break;
      case 'deleteBranch':
        endpoint = `/repositories/${repoPath}/refs/branches/${encodeURIComponent(config.branchName || '')}`;
        method = 'DELETE';
        break;

      // Pull Requests
      case 'getPullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}`;
        break;
      case 'listPullRequests':
        endpoint = `/repositories/${repoPath}/pullrequests?pagelen=${config.pagelen}`;
        if (config.state) endpoint += `&state=${config.state}`;
        break;
      case 'createPullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests`;
        method = 'POST';
        body = {
          title: config.title,
          description: config.description,
          source: { branch: { name: config.sourceBranch } },
          destination: { branch: { name: config.destinationBranch } },
          close_source_branch: config.closeSourceBranch,
          reviewers: config.reviewers,
        };
        break;
      case 'updatePullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}`;
        method = 'PUT';
        body = {
          title: config.title,
          description: config.description,
        };
        break;
      case 'mergePullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/merge`;
        method = 'POST';
        body = {
          close_source_branch: config.closeSourceBranch,
          message: config.commitMessage,
        };
        break;
      case 'declinePullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/decline`;
        method = 'POST';
        break;
      case 'approvePullRequest':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/approve`;
        method = 'POST';
        break;
      case 'requestChanges':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/request-changes`;
        method = 'POST';
        break;

      // Commits
      case 'getCommit':
        endpoint = `/repositories/${repoPath}/commit/${config.commitHash}`;
        break;
      case 'listCommits':
        endpoint = `/repositories/${repoPath}/commits?pagelen=${config.pagelen}`;
        break;
      case 'compare':
        endpoint = `/repositories/${repoPath}/diff/${config.spec}`;
        break;

      // Files
      case 'getFile':
        endpoint = `/repositories/${repoPath}/src/${config.branch}/${config.filePath}`;
        break;
      case 'createFile':
      case 'updateFile':
        endpoint = `/repositories/${repoPath}/src`;
        method = 'POST';
        // Bitbucket uses multipart form data for file commits
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        body = {
          [config.filePath || '']: config.fileContent,
          message: config.commitMessage,
          branch: config.branch,
        };
        break;
      case 'deleteFile':
        endpoint = `/repositories/${repoPath}/src`;
        method = 'POST';
        body = {
          files: config.filePath,
          message: config.commitMessage,
          branch: config.branch,
        };
        break;
      case 'listDirectory':
        endpoint = `/repositories/${repoPath}/src/${config.branch}/${config.filePath || ''}`;
        break;

      // Issues
      case 'getIssue':
        endpoint = `/repositories/${repoPath}/issues/${config.issueId}`;
        break;
      case 'listIssues':
        endpoint = `/repositories/${repoPath}/issues?pagelen=${config.pagelen}`;
        break;
      case 'createIssue':
        endpoint = `/repositories/${repoPath}/issues`;
        method = 'POST';
        body = {
          title: config.title,
          content: { raw: config.description },
          priority: config.priority,
          kind: config.kind,
          assignee: config.assignee ? { username: config.assignee } : undefined,
        };
        break;
      case 'updateIssue':
        endpoint = `/repositories/${repoPath}/issues/${config.issueId}`;
        method = 'PUT';
        body = {
          title: config.title,
          content: config.description ? { raw: config.description } : undefined,
          priority: config.priority,
          kind: config.kind,
          state: config.state,
        };
        break;

      // Comments
      case 'listComments':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/comments?pagelen=${config.pagelen}`;
        break;
      case 'createComment':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/comments`;
        method = 'POST';
        body = {
          content: { raw: config.commentContent },
          parent: config.parentCommentId ? { id: config.parentCommentId } : undefined,
          inline: config.inline,
        };
        break;
      case 'updateComment':
        endpoint = `/repositories/${repoPath}/pullrequests/${config.prId}/comments/${config.commentId}`;
        method = 'PUT';
        body = { content: { raw: config.commentContent } };
        break;

      // Webhooks
      case 'listWebhooks':
        endpoint = `/repositories/${repoPath}/hooks`;
        break;
      case 'createWebhook':
        endpoint = `/repositories/${repoPath}/hooks`;
        method = 'POST';
        body = {
          description: config.title,
          url: config.webhookUrl,
          active: config.webhookActive,
          events: config.webhookEvents,
          secret: config.webhookSecret,
        };
        break;
      case 'deleteWebhook':
        endpoint = `/repositories/${repoPath}/hooks/${config.webhookUuid}`;
        method = 'DELETE';
        break;

      // Pipelines
      case 'getPipeline':
        endpoint = `/repositories/${repoPath}/pipelines/${config.pipelineUuid}`;
        break;
      case 'listPipelines':
        endpoint = `/repositories/${repoPath}/pipelines?pagelen=${config.pagelen}`;
        if (config.sort) endpoint += `&sort=${config.sort}`;
        break;
      case 'triggerPipeline':
        endpoint = `/repositories/${repoPath}/pipelines`;
        method = 'POST';
        body = {
          target: config.pipelineTarget,
          variables: config.pipelineVariables,
        };
        break;
      case 'stopPipeline':
        endpoint = `/repositories/${repoPath}/pipelines/${config.pipelineUuid}/stopPipeline`;
        method = 'POST';
        break;
      case 'getPipelineStep':
        endpoint = `/repositories/${repoPath}/pipelines/${config.pipelineUuid}/steps/${config.stepUuid}`;
        break;
      case 'getPipelineLog':
        endpoint = `/repositories/${repoPath}/pipelines/${config.pipelineUuid}/steps/${config.stepUuid}/log`;
        break;

      // Deployments
      case 'listDeployments':
        endpoint = `/repositories/${repoPath}/deployments`;
        break;

      // User/Workspaces
      case 'getCurrentUser':
        endpoint = `/user`;
        break;
      case 'listWorkspaces':
        endpoint = `/workspaces?pagelen=${config.pagelen}`;
        break;
      case 'getWorkspace':
        endpoint = `/workspaces/${workspace}`;
        break;
      case 'listWorkspaceMembers':
        endpoint = `/workspaces/${workspace}/members?pagelen=${config.pagelen}`;
        break;

      // Downloads
      case 'getArchive':
        endpoint = `/repositories/${repoPath}/downloads/${config.downloadFilename}`;
        break;

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json() as Record<string, unknown> & { error?: { message: string } };

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${result.error?.message || response.statusText}`);
    }

    return {
      data: {
        result,
        values: (result.values as unknown[]) || [],
        page: {
          size: result.size,
          page: result.page,
          pagelen: result.pagelen,
          next: result.next,
          previous: result.previous,
        },
        error: null,
      },
    };
  }
);
