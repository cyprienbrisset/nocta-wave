import { api } from './client';

export type BranchStatus = 'ACTIVE' | 'MERGED' | 'CLOSED' | 'DELETED';
export type PRStatus = 'OPEN' | 'MERGED' | 'CLOSED';
export type MergeStrategy = 'MERGE' | 'SQUASH' | 'REBASE';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED';

export interface WorkflowBranch {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  baseBranchId?: string;
  graph: Record<string, unknown>;
  settings?: Record<string, unknown>;
  status: BranchStatus;
  createdById: string;
  lastCommitId?: string;
  mergedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  workflow?: {
    id: string;
    name: string;
    teamId: string;
  };
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  baseBranch?: {
    id: string;
    name: string;
  };
  commits?: BranchCommit[];
  _count?: {
    commits: number;
    pullRequests: number;
  };
}

export interface BranchCommit {
  id: string;
  branchId: string;
  message: string;
  graph: Record<string, unknown>;
  settings?: Record<string, unknown>;
  authorId: string;
  parentId?: string;
  hash: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface PRReview {
  id: string;
  prId: string;
  reviewerId: string;
  status: ReviewStatus;
  body?: string;
  createdAt: string;
  reviewer?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface PRComment {
  id: string;
  prId: string;
  authorId: string;
  body: string;
  nodeId?: string;
  parentId?: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  replies?: PRComment[];
}

export interface WorkflowPullRequest {
  id: string;
  workflowId: string;
  title: string;
  description?: string;
  sourceBranchId: string;
  targetBranchId: string;
  authorId: string;
  status: PRStatus;
  reviewRequired: boolean;
  conflictData?: unknown;
  mergedAt?: string;
  mergedById?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  workflow?: {
    id: string;
    name: string;
    teamId: string;
  };
  sourceBranch?: WorkflowBranch;
  targetBranch?: WorkflowBranch;
  author?: {
    id: string;
    name: string;
    avatar?: string;
  };
  reviews?: PRReview[];
  comments?: PRComment[];
  _count?: {
    comments: number;
    reviews: number;
  };
}

export interface BranchDiff {
  added: Array<{ id: string; type: string; position: { x: number; y: number }; data: unknown }>;
  removed: Array<{ id: string; type: string; position: { x: number; y: number }; data: unknown }>;
  modified: Array<{ id: string; source: unknown; target: unknown }>;
  edgesChanged: {
    added: Array<{ id: string; source: string; target: string }>;
    removed: Array<{ id: string; source: string; target: string }>;
  };
}

export interface CreateBranchDto {
  workflowId: string;
  name: string;
  description?: string;
  baseBranchId?: string;
}

export interface CreatePullRequestDto {
  workflowId: string;
  title: string;
  description?: string;
  sourceBranchId: string;
  targetBranchId: string;
  reviewRequired?: boolean;
}

export const branchesApi = {
  // ============================================================================
  // BRANCHES
  // ============================================================================

  /**
   * Get all branches for a workflow
   */
  getBranches: async (workflowId: string): Promise<WorkflowBranch[]> => {
    return api.get(`/branches/workflow/${workflowId}`);
  },

  /**
   * Get branch by ID
   */
  getBranch: async (id: string): Promise<WorkflowBranch> => {
    return api.get(`/branches/${id}`);
  },

  /**
   * Create a new branch
   */
  createBranch: async (data: CreateBranchDto): Promise<WorkflowBranch> => {
    return api.post('/branches', data);
  },

  /**
   * Update branch graph
   */
  updateBranchGraph: async (
    id: string,
    graph: Record<string, unknown>,
    settings?: Record<string, unknown>,
    commitMessage?: string,
  ): Promise<WorkflowBranch> => {
    return api.put(`/branches/${id}/graph`, { graph, settings, commitMessage });
  },

  /**
   * Delete a branch
   */
  deleteBranch: async (id: string): Promise<{ success: boolean }> => {
    return api.delete(`/branches/${id}`);
  },

  // ============================================================================
  // COMMITS
  // ============================================================================

  /**
   * Get commit history for a branch
   */
  getCommitHistory: async (branchId: string, limit?: number): Promise<BranchCommit[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return api.get(`/branches/${branchId}/commits${params}`);
  },

  /**
   * Create a commit
   */
  createCommit: async (
    branchId: string,
    message: string,
    graph: Record<string, unknown>,
    settings?: Record<string, unknown>,
  ): Promise<BranchCommit> => {
    return api.post(`/branches/${branchId}/commits`, { message, graph, settings });
  },

  /**
   * Get a specific commit
   */
  getCommit: async (commitId: string): Promise<BranchCommit> => {
    return api.get(`/branches/commits/${commitId}`);
  },

  // ============================================================================
  // PULL REQUESTS
  // ============================================================================

  /**
   * Get pull requests for a workflow
   */
  getPullRequests: async (workflowId: string, status?: PRStatus): Promise<WorkflowPullRequest[]> => {
    const params = status ? `?status=${status}` : '';
    return api.get(`/branches/workflow/${workflowId}/pull-requests${params}`);
  },

  /**
   * Get pull request by ID
   */
  getPullRequest: async (id: string): Promise<WorkflowPullRequest> => {
    return api.get(`/branches/pull-requests/${id}`);
  },

  /**
   * Create a pull request
   */
  createPullRequest: async (data: CreatePullRequestDto): Promise<WorkflowPullRequest> => {
    return api.post('/branches/pull-requests', data);
  },

  /**
   * Add a review to a PR
   */
  addReview: async (
    prId: string,
    status: ReviewStatus,
    body?: string,
  ): Promise<PRReview> => {
    return api.post(`/branches/pull-requests/${prId}/reviews`, { status, body });
  },

  /**
   * Merge a pull request
   */
  mergePullRequest: async (
    prId: string,
    strategy?: MergeStrategy,
  ): Promise<{ success: boolean; prId: string }> => {
    return api.post(`/branches/pull-requests/${prId}/merge`, { strategy });
  },

  /**
   * Close a pull request
   */
  closePullRequest: async (prId: string): Promise<{ success: boolean }> => {
    return api.post(`/branches/pull-requests/${prId}/close`);
  },

  /**
   * Add comment to PR
   */
  addComment: async (
    prId: string,
    body: string,
    nodeId?: string,
    parentId?: string,
  ): Promise<PRComment> => {
    return api.post(`/branches/pull-requests/${prId}/comments`, { body, nodeId, parentId });
  },

  /**
   * Resolve a comment
   */
  resolveComment: async (commentId: string): Promise<{ success: boolean }> => {
    return api.post(`/branches/comments/${commentId}/resolve`);
  },

  /**
   * Get diff between two branches
   */
  getDiff: async (sourceBranchId: string, targetBranchId: string): Promise<BranchDiff> => {
    return api.get(`/branches/diff?source=${sourceBranchId}&target=${targetBranchId}`);
  },
};
