import { api } from './client';

export interface SubWorkflowInputParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface SubWorkflowOutputParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  label: string;
  description?: string;
}

export interface SubWorkflow {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  inputSchema: SubWorkflowInputParam[];
  outputSchema: SubWorkflowOutputParam[];
  version: number;
  isLatest: boolean;
  isPublic: boolean;
  isShared: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  workflow?: {
    id: string;
    name: string;
    teamId: string;
  };
}

export interface SubWorkflowUsage {
  id: string;
  subWorkflowId: string;
  parentWorkflowId: string;
  nodeId: string;
  versionPinned: boolean;
  pinnedVersion?: number;
  createdAt: string;
  subWorkflow: SubWorkflow;
  parentWorkflow: {
    id: string;
    name: string;
  };
}

export interface CreateSubWorkflowDto {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema: SubWorkflowInputParam[];
  outputSchema: SubWorkflowOutputParam[];
  isPublic?: boolean;
  isShared?: boolean;
}

export interface UpdateSubWorkflowDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema?: SubWorkflowInputParam[];
  outputSchema?: SubWorkflowOutputParam[];
  isPublic?: boolean;
  isShared?: boolean;
}

export interface LibraryQueryParams {
  category?: string;
  search?: string;
  includePublic?: boolean;
  skip?: number;
  take?: number;
}

export interface SubWorkflowLibrary {
  subWorkflows: SubWorkflow[];
  total: number;
  hasMore: boolean;
}

export interface SubWorkflowVersion {
  id: string;
  version: number;
  graph: unknown;
  settings?: unknown;
  changelog?: string;
  createdAt: string;
}

export const subworkflowsApi = {
  /**
   * Create a sub-workflow from a workflow
   */
  create: (data: CreateSubWorkflowDto): Promise<SubWorkflow> => {
    return api.post('/subworkflows', data);
  },

  /**
   * Get the sub-workflow library
   */
  getLibrary: (params?: LibraryQueryParams): Promise<SubWorkflowLibrary> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.includePublic !== undefined) {
      searchParams.set('includePublic', String(params.includePublic));
    }
    if (params?.skip !== undefined) searchParams.set('skip', String(params.skip));
    if (params?.take !== undefined) searchParams.set('take', String(params.take));

    const queryString = searchParams.toString();
    return api.get(`/subworkflows/library${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get available categories
   */
  getCategories: (): Promise<string[]> => {
    return api.get('/subworkflows/categories');
  },

  /**
   * Get a sub-workflow by ID
   */
  getById: (id: string): Promise<SubWorkflow> => {
    return api.get(`/subworkflows/${id}`);
  },

  /**
   * Get sub-workflow by workflow ID
   */
  getByWorkflowId: (workflowId: string): Promise<SubWorkflow | null> => {
    return api.get(`/subworkflows/workflow/${workflowId}`);
  },

  /**
   * Update a sub-workflow
   */
  update: (id: string, data: UpdateSubWorkflowDto): Promise<SubWorkflow> => {
    return api.put(`/subworkflows/${id}`, data);
  },

  /**
   * Publish a new version
   */
  publishVersion: (id: string): Promise<SubWorkflow> => {
    return api.post(`/subworkflows/${id}/publish`);
  },

  /**
   * Get version history
   */
  getVersionHistory: (id: string): Promise<SubWorkflowVersion[]> => {
    return api.get(`/subworkflows/${id}/versions`);
  },

  /**
   * Get usages of a sub-workflow
   */
  getUsages: (id: string): Promise<SubWorkflowUsage[]> => {
    return api.get(`/subworkflows/${id}/usages`);
  },

  /**
   * Record usage of a sub-workflow in a workflow
   */
  recordUsage: (
    id: string,
    parentWorkflowId: string,
    nodeId: string,
    options?: { versionPinned?: boolean; pinnedVersion?: number }
  ): Promise<SubWorkflowUsage> => {
    return api.post(`/subworkflows/${id}/usage`, {
      parentWorkflowId,
      nodeId,
      ...options,
    });
  },

  /**
   * Remove usage record
   */
  removeUsage: (parentWorkflowId: string, nodeId: string): Promise<void> => {
    return api.delete(`/subworkflows/usage/${parentWorkflowId}/${nodeId}`);
  },

  /**
   * Delete a sub-workflow
   */
  delete: (id: string): Promise<void> => {
    return api.delete(`/subworkflows/${id}`);
  },

  /**
   * Validate input data against sub-workflow schema
   */
  validateInput: (
    id: string,
    inputData: Record<string, unknown>
  ): Promise<{ valid: boolean; errors?: string[] }> => {
    return api.post(`/subworkflows/${id}/validate`, { inputData });
  },
};
