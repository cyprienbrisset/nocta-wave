import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GitLabSchema = z.object({
  operation: z.enum([
    // Project operations
    'getProject',
    'listProjects',
    'createProject',
    'deleteProject',
    // Issue operations
    'getIssue',
    'listIssues',
    'createIssue',
    'updateIssue',
    'closeIssue',
    // Merge Request operations
    'getMergeRequest',
    'listMergeRequests',
    'createMergeRequest',
    'updateMergeRequest',
    'mergeMergeRequest',
    'approveMergeRequest',
    // Pipeline operations
    'getPipeline',
    'listPipelines',
    'createPipeline',
    'retryPipeline',
    'cancelPipeline',
    'getJobs',
    // Branch operations
    'listBranches',
    'createBranch',
    'deleteBranch',
    'protectBranch',
    // Tag operations
    'listTags',
    'createTag',
    // File operations
    'getFile',
    'createFile',
    'updateFile',
    'deleteFile',
    // User & Group operations
    'getCurrentUser',
    'listUsers',
    'listGroups',
    'getGroup',
    // Repository operations
    'getCommit',
    'listCommits',
    'compare',
    // Webhook operations
    'listHooks',
    'createHook',
    'deleteHook',
    // Release operations
    'listReleases',
    'createRelease',
    // Notes/Comments
    'listNotes',
    'createNote',
  ]).default('listProjects'),
  // Base configuration
  baseUrl: z.string().url().default('https://gitlab.com'),
  projectId: z.string().optional(),
  // Issue fields
  issueIid: z.number().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).optional(),
  assigneeIds: z.array(z.number()).optional(),
  milestoneId: z.number().optional(),
  dueDate: z.string().optional(),
  weight: z.number().optional(),
  issueType: z.enum(['issue', 'incident', 'test_case']).optional(),
  confidential: z.boolean().optional(),
  // Merge request fields
  mrIid: z.number().optional(),
  sourceBranch: z.string().optional(),
  targetBranch: z.string().optional(),
  removeSourceBranch: z.boolean().optional(),
  squash: z.boolean().optional(),
  draft: z.boolean().optional(),
  allowCollaboration: z.boolean().optional(),
  // Pipeline fields
  pipelineId: z.number().optional(),
  ref: z.string().optional(),
  variables: z.array(z.object({
    key: z.string(),
    value: z.string(),
    variableType: z.enum(['env_var', 'file']).default('env_var'),
  })).optional(),
  // Branch fields
  branchName: z.string().optional(),
  branchRef: z.string().optional(),
  protectedBranch: z.object({
    pushAccessLevel: z.number().optional(),
    mergeAccessLevel: z.number().optional(),
    allowForcePush: z.boolean().optional(),
  }).optional(),
  // Tag fields
  tagName: z.string().optional(),
  tagMessage: z.string().optional(),
  // File fields
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
  branch: z.string().optional(),
  commitMessage: z.string().optional(),
  encoding: z.enum(['text', 'base64']).default('text'),
  // Compare fields
  from: z.string().optional(),
  to: z.string().optional(),
  // Hook fields
  hookUrl: z.string().optional(),
  hookEvents: z.object({
    pushEvents: z.boolean().optional(),
    issuesEvents: z.boolean().optional(),
    mergeRequestsEvents: z.boolean().optional(),
    tagPushEvents: z.boolean().optional(),
    pipelineEvents: z.boolean().optional(),
    jobEvents: z.boolean().optional(),
    deploymentEvents: z.boolean().optional(),
    releaseEvents: z.boolean().optional(),
  }).optional(),
  hookToken: z.string().optional(),
  hookId: z.number().optional(),
  // Release fields
  releaseName: z.string().optional(),
  releaseDescription: z.string().optional(),
  assets: z.object({
    links: z.array(z.object({
      name: z.string(),
      url: z.string(),
      linkType: z.enum(['other', 'runbook', 'image', 'package']).optional(),
    })).optional(),
  }).optional(),
  // Notes fields
  noteableType: z.enum(['Issue', 'MergeRequest', 'Snippet', 'Commit']).optional(),
  noteableIid: z.number().optional(),
  noteBody: z.string().optional(),
  // Pagination
  page: z.number().optional(),
  perPage: z.number().min(1).max(100).default(20),
  // Filters
  state: z.enum(['opened', 'closed', 'merged', 'all']).optional(),
  scope: z.enum(['created_by_me', 'assigned_to_me', 'all']).optional(),
  orderBy: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  // Group fields
  groupId: z.string().optional(),
});

export const gitlabNode: NodeDefinition = createNode(
  {
    type: 'integration.gitlab',
    category: 'integration',
    name: 'GitLab',
    description: 'Complete GitLab integration - projects, issues, merge requests, pipelines, branches, and more',
    icon: 'GitBranch',
    inputs: [
      input.select('operation', 'Operation', [
        // Project
        { label: 'Get Project', value: 'getProject' },
        { label: 'List Projects', value: 'listProjects' },
        { label: 'Create Project', value: 'createProject' },
        { label: 'Delete Project', value: 'deleteProject' },
        // Issues
        { label: 'Get Issue', value: 'getIssue' },
        { label: 'List Issues', value: 'listIssues' },
        { label: 'Create Issue', value: 'createIssue' },
        { label: 'Update Issue', value: 'updateIssue' },
        { label: 'Close Issue', value: 'closeIssue' },
        // Merge Requests
        { label: 'Get Merge Request', value: 'getMergeRequest' },
        { label: 'List Merge Requests', value: 'listMergeRequests' },
        { label: 'Create Merge Request', value: 'createMergeRequest' },
        { label: 'Update Merge Request', value: 'updateMergeRequest' },
        { label: 'Merge', value: 'mergeMergeRequest' },
        { label: 'Approve MR', value: 'approveMergeRequest' },
        // Pipelines
        { label: 'Get Pipeline', value: 'getPipeline' },
        { label: 'List Pipelines', value: 'listPipelines' },
        { label: 'Create Pipeline', value: 'createPipeline' },
        { label: 'Retry Pipeline', value: 'retryPipeline' },
        { label: 'Cancel Pipeline', value: 'cancelPipeline' },
        { label: 'Get Jobs', value: 'getJobs' },
        // Branches
        { label: 'List Branches', value: 'listBranches' },
        { label: 'Create Branch', value: 'createBranch' },
        { label: 'Delete Branch', value: 'deleteBranch' },
        { label: 'Protect Branch', value: 'protectBranch' },
        // Tags
        { label: 'List Tags', value: 'listTags' },
        { label: 'Create Tag', value: 'createTag' },
        // Files
        { label: 'Get File', value: 'getFile' },
        { label: 'Create File', value: 'createFile' },
        { label: 'Update File', value: 'updateFile' },
        { label: 'Delete File', value: 'deleteFile' },
        // Users & Groups
        { label: 'Get Current User', value: 'getCurrentUser' },
        { label: 'List Users', value: 'listUsers' },
        { label: 'List Groups', value: 'listGroups' },
        { label: 'Get Group', value: 'getGroup' },
        // Repository
        { label: 'Get Commit', value: 'getCommit' },
        { label: 'List Commits', value: 'listCommits' },
        { label: 'Compare Branches', value: 'compare' },
        // Webhooks
        { label: 'List Hooks', value: 'listHooks' },
        { label: 'Create Hook', value: 'createHook' },
        { label: 'Delete Hook', value: 'deleteHook' },
        // Releases
        { label: 'List Releases', value: 'listReleases' },
        { label: 'Create Release', value: 'createRelease' },
        // Notes
        { label: 'List Notes', value: 'listNotes' },
        { label: 'Create Note', value: 'createNote' },
      ], { default: 'listProjects' }),
      input.string('baseUrl', 'GitLab URL', {
        default: 'https://gitlab.com',
        description: 'GitLab instance URL (for self-hosted)',
      }),
      input.string('projectId', 'Project ID', {
        description: 'Project ID or path (e.g., "owner/repo" or "123")',
        placeholder: 'group/project-name',
      }),
      // Issue fields
      input.number('issueIid', 'Issue IID', {
        description: 'Issue internal ID',
      }),
      input.string('title', 'Title', {
        description: 'Title for issue, MR, or release',
      }),
      input.string('description', 'Description', {
        description: 'Description or body text',
      }),
      input.json('labels', 'Labels', {
        description: 'Array of label names',
        placeholder: '["bug", "priority::high"]',
      }),
      input.json('assigneeIds', 'Assignee IDs', {
        description: 'Array of user IDs to assign',
      }),
      input.number('milestoneId', 'Milestone ID'),
      input.string('dueDate', 'Due Date', {
        description: 'Due date in YYYY-MM-DD format',
        placeholder: '2024-12-31',
      }),
      input.select('issueType', 'Issue Type', [
        { label: 'Issue', value: 'issue' },
        { label: 'Incident', value: 'incident' },
        { label: 'Test Case', value: 'test_case' },
      ]),
      input.boolean('confidential', 'Confidential', { default: false }),
      // MR fields
      input.number('mrIid', 'Merge Request IID'),
      input.string('sourceBranch', 'Source Branch'),
      input.string('targetBranch', 'Target Branch', { default: 'main' }),
      input.boolean('removeSourceBranch', 'Remove Source Branch on Merge', { default: false }),
      input.boolean('squash', 'Squash Commits', { default: false }),
      input.boolean('draft', 'Draft MR', { default: false }),
      // Pipeline fields
      input.number('pipelineId', 'Pipeline ID'),
      input.string('ref', 'Ref', {
        description: 'Branch, tag, or commit SHA',
      }),
      input.json('variables', 'Pipeline Variables', {
        description: 'Variables to pass to the pipeline',
        placeholder: '[{"key": "DEPLOY_ENV", "value": "staging"}]',
      }),
      // Branch fields
      input.string('branchName', 'Branch Name'),
      input.string('branchRef', 'Branch From Ref', {
        description: 'Create branch from this ref',
      }),
      // Tag fields
      input.string('tagName', 'Tag Name'),
      input.string('tagMessage', 'Tag Message'),
      // File fields
      input.string('filePath', 'File Path', {
        placeholder: 'src/config.json',
      }),
      input.code('fileContent', 'File Content', {
        language: 'text',
      }),
      input.string('branch', 'Branch', { default: 'main' }),
      input.string('commitMessage', 'Commit Message'),
      input.select('encoding', 'File Encoding', [
        { label: 'Text', value: 'text' },
        { label: 'Base64', value: 'base64' },
      ], { default: 'text' }),
      // Compare fields
      input.string('from', 'From Ref', { description: 'Base commit/branch' }),
      input.string('to', 'To Ref', { description: 'Head commit/branch' }),
      // Hook fields
      input.string('hookUrl', 'Webhook URL'),
      input.json('hookEvents', 'Hook Events', {
        description: 'Events to trigger the webhook',
        placeholder: '{"pushEvents": true, "mergeRequestsEvents": true}',
      }),
      input.string('hookToken', 'Hook Secret Token'),
      input.number('hookId', 'Hook ID'),
      // Release fields
      input.string('releaseName', 'Release Name'),
      input.string('releaseDescription', 'Release Description'),
      // Notes fields
      input.select('noteableType', 'Note Type', [
        { label: 'Issue', value: 'Issue' },
        { label: 'Merge Request', value: 'MergeRequest' },
        { label: 'Snippet', value: 'Snippet' },
        { label: 'Commit', value: 'Commit' },
      ]),
      input.number('noteableIid', 'Noteable IID'),
      input.string('noteBody', 'Note Body'),
      // Pagination
      input.number('page', 'Page', { default: 1 }),
      input.number('perPage', 'Per Page', { default: 20 }),
      // Filters
      input.select('state', 'State', [
        { label: 'All', value: 'all' },
        { label: 'Opened', value: 'opened' },
        { label: 'Closed', value: 'closed' },
        { label: 'Merged', value: 'merged' },
      ]),
      input.select('scope', 'Scope', [
        { label: 'All', value: 'all' },
        { label: 'Created by Me', value: 'created_by_me' },
        { label: 'Assigned to Me', value: 'assigned_to_me' },
      ]),
      input.string('orderBy', 'Order By'),
      input.select('sort', 'Sort', [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' },
      ]),
      // Group fields
      input.string('groupId', 'Group ID', { description: 'Group ID or path' }),
    ],
    outputs: [
      output.object('result', 'GitLab API response'),
      output.array('items', 'List items (for list operations)'),
      output.object('pagination', 'Pagination info (total, page, per_page)'),
      output.object('error', 'Error details if operation failed'),
    ],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GitLabSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`GitLab: ${config.operation}`);

    if (!credentials?.apiKey) {
      throw new Error('GitLab personal access token is required');
    }

    const baseUrl = config.baseUrl.replace(/\/$/, '');
    const headers: Record<string, string> = {
      'PRIVATE-TOKEN': credentials.apiKey as string,
      'Content-Type': 'application/json',
    };

    const projectPath = config.projectId ? encodeURIComponent(config.projectId) : '';

    let endpoint = '';
    let method = 'GET';
    let body: Record<string, unknown> | undefined;

    switch (config.operation) {
      // Projects
      case 'getProject':
        endpoint = `/api/v4/projects/${projectPath}`;
        break;
      case 'listProjects':
        endpoint = `/api/v4/projects?page=${config.page}&per_page=${config.perPage}`;
        break;
      case 'createProject':
        endpoint = `/api/v4/projects`;
        method = 'POST';
        body = { name: config.title, description: config.description };
        break;
      case 'deleteProject':
        endpoint = `/api/v4/projects/${projectPath}`;
        method = 'DELETE';
        break;

      // Issues
      case 'getIssue':
        endpoint = `/api/v4/projects/${projectPath}/issues/${config.issueIid}`;
        break;
      case 'listIssues':
        endpoint = `/api/v4/projects/${projectPath}/issues?page=${config.page}&per_page=${config.perPage}`;
        if (config.state) endpoint += `&state=${config.state}`;
        break;
      case 'createIssue':
        endpoint = `/api/v4/projects/${projectPath}/issues`;
        method = 'POST';
        body = {
          title: config.title,
          description: config.description,
          labels: config.labels?.join(','),
          assignee_ids: config.assigneeIds,
          milestone_id: config.milestoneId,
          due_date: config.dueDate,
          confidential: config.confidential,
          issue_type: config.issueType,
        };
        break;
      case 'updateIssue':
        endpoint = `/api/v4/projects/${projectPath}/issues/${config.issueIid}`;
        method = 'PUT';
        body = {
          title: config.title,
          description: config.description,
          labels: config.labels?.join(','),
        };
        break;
      case 'closeIssue':
        endpoint = `/api/v4/projects/${projectPath}/issues/${config.issueIid}`;
        method = 'PUT';
        body = { state_event: 'close' };
        break;

      // Merge Requests
      case 'getMergeRequest':
        endpoint = `/api/v4/projects/${projectPath}/merge_requests/${config.mrIid}`;
        break;
      case 'listMergeRequests':
        endpoint = `/api/v4/projects/${projectPath}/merge_requests?page=${config.page}&per_page=${config.perPage}`;
        if (config.state) endpoint += `&state=${config.state}`;
        break;
      case 'createMergeRequest':
        endpoint = `/api/v4/projects/${projectPath}/merge_requests`;
        method = 'POST';
        body = {
          source_branch: config.sourceBranch,
          target_branch: config.targetBranch,
          title: config.title,
          description: config.description,
          remove_source_branch: config.removeSourceBranch,
          squash: config.squash,
        };
        break;
      case 'mergeMergeRequest':
        endpoint = `/api/v4/projects/${projectPath}/merge_requests/${config.mrIid}/merge`;
        method = 'PUT';
        body = {
          should_remove_source_branch: config.removeSourceBranch,
          squash: config.squash,
        };
        break;
      case 'approveMergeRequest':
        endpoint = `/api/v4/projects/${projectPath}/merge_requests/${config.mrIid}/approve`;
        method = 'POST';
        break;

      // Pipelines
      case 'getPipeline':
        endpoint = `/api/v4/projects/${projectPath}/pipelines/${config.pipelineId}`;
        break;
      case 'listPipelines':
        endpoint = `/api/v4/projects/${projectPath}/pipelines?page=${config.page}&per_page=${config.perPage}`;
        break;
      case 'createPipeline':
        endpoint = `/api/v4/projects/${projectPath}/pipeline`;
        method = 'POST';
        body = { ref: config.ref, variables: config.variables };
        break;
      case 'retryPipeline':
        endpoint = `/api/v4/projects/${projectPath}/pipelines/${config.pipelineId}/retry`;
        method = 'POST';
        break;
      case 'cancelPipeline':
        endpoint = `/api/v4/projects/${projectPath}/pipelines/${config.pipelineId}/cancel`;
        method = 'POST';
        break;
      case 'getJobs':
        endpoint = `/api/v4/projects/${projectPath}/pipelines/${config.pipelineId}/jobs`;
        break;

      // Branches
      case 'listBranches':
        endpoint = `/api/v4/projects/${projectPath}/repository/branches`;
        break;
      case 'createBranch':
        endpoint = `/api/v4/projects/${projectPath}/repository/branches`;
        method = 'POST';
        body = { branch: config.branchName, ref: config.branchRef };
        break;
      case 'deleteBranch':
        endpoint = `/api/v4/projects/${projectPath}/repository/branches/${encodeURIComponent(config.branchName || '')}`;
        method = 'DELETE';
        break;

      // Files
      case 'getFile':
        endpoint = `/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(config.filePath || '')}?ref=${config.branch}`;
        break;
      case 'createFile':
        endpoint = `/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(config.filePath || '')}`;
        method = 'POST';
        body = {
          branch: config.branch,
          content: config.fileContent,
          commit_message: config.commitMessage,
          encoding: config.encoding,
        };
        break;
      case 'updateFile':
        endpoint = `/api/v4/projects/${projectPath}/repository/files/${encodeURIComponent(config.filePath || '')}`;
        method = 'PUT';
        body = {
          branch: config.branch,
          content: config.fileContent,
          commit_message: config.commitMessage,
          encoding: config.encoding,
        };
        break;

      // Compare
      case 'compare':
        endpoint = `/api/v4/projects/${projectPath}/repository/compare?from=${config.from}&to=${config.to}`;
        break;

      // Current user
      case 'getCurrentUser':
        endpoint = `/api/v4/user`;
        break;

      // Releases
      case 'listReleases':
        endpoint = `/api/v4/projects/${projectPath}/releases`;
        break;
      case 'createRelease':
        endpoint = `/api/v4/projects/${projectPath}/releases`;
        method = 'POST';
        body = {
          name: config.releaseName,
          tag_name: config.tagName,
          description: config.releaseDescription,
          assets: config.assets,
        };
        break;

      // Notes
      case 'listNotes':
        const noteableTypeLower = config.noteableType?.toLowerCase() || 'issues';
        endpoint = `/api/v4/projects/${projectPath}/${noteableTypeLower}/${config.noteableIid}/notes`;
        break;
      case 'createNote':
        const noteableType2 = config.noteableType?.toLowerCase() || 'issues';
        endpoint = `/api/v4/projects/${projectPath}/${noteableType2}/${config.noteableIid}/notes`;
        method = 'POST';
        body = { body: config.noteBody };
        break;

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseHeaders = Object.fromEntries(response.headers.entries());
    const result = await response.json() as Record<string, unknown> & { message?: string; error?: string };

    if (!response.ok) {
      throw new Error(`GitLab API error: ${result.message || result.error || response.statusText}`);
    }

    const pagination = {
      total: responseHeaders['x-total'] as string | undefined,
      page: responseHeaders['x-page'] as string | undefined,
      perPage: responseHeaders['x-per-page'] as string | undefined,
      totalPages: responseHeaders['x-total-pages'] as string | undefined,
      nextPage: responseHeaders['x-next-page'] as string | undefined,
      prevPage: responseHeaders['x-prev-page'] as string | undefined,
    };

    return {
      data: {
        result: Array.isArray(result) ? { items: result } : result,
        items: Array.isArray(result) ? result : [],
        pagination,
        error: null,
      },
    };
  }
);
