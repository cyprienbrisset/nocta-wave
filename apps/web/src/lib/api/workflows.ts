import { api } from './client';

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  teamId: string;
  createdById: string;
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  isActive: boolean;
  version: number;
  graph: WorkflowGraph;
  settings: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    executions: number;
    versions: number;
  };
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    config?: Record<string, any>;
    credentialId?: string;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowListResponse {
  data: Workflow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  graph?: WorkflowGraph;
  settings?: Record<string, any>;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  graph?: WorkflowGraph;
  settings?: Record<string, any>;
  status?: Workflow['status'];
  isActive?: boolean;
  changelog?: string;
}

export const workflowsApi = {
  async list(params?: {
    status?: string;
    search?: string;
    skip?: number;
    take?: number;
  }): Promise<WorkflowListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());

    const query = searchParams.toString();
    return api.get<WorkflowListResponse>(`/workflows${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<Workflow> {
    return api.get<Workflow>(`/workflows/${id}`);
  },

  async create(data: CreateWorkflowRequest): Promise<Workflow> {
    return api.post<Workflow>('/workflows', data);
  },

  async update(id: string, data: UpdateWorkflowRequest): Promise<Workflow> {
    return api.put<Workflow>(`/workflows/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  async duplicate(id: string): Promise<Workflow> {
    return api.post<Workflow>(`/workflows/${id}/duplicate`);
  },

  async activate(id: string): Promise<Workflow> {
    return api.post<Workflow>(`/workflows/${id}/activate`);
  },

  async deactivate(id: string): Promise<Workflow> {
    return api.post<Workflow>(`/workflows/${id}/deactivate`);
  },

  async getVersions(id: string): Promise<Array<{
    id: string;
    version: number;
    changelog: string | null;
    createdAt: string;
  }>> {
    return api.get(`/workflows/${id}/versions`);
  },

  async restoreVersion(id: string, versionId: string): Promise<Workflow> {
    return api.post<Workflow>(`/workflows/${id}/versions/${versionId}/restore`);
  },

  async getVersion(id: string, versionId: string): Promise<{
    id: string;
    version: number;
    graph: WorkflowGraph;
    settings: Record<string, any> | null;
    changelog: string | null;
    createdAt: string;
  }> {
    return api.get(`/workflows/${id}/versions/${versionId}`);
  },

  async getVersionDiff(id: string, versionId: string): Promise<{
    version: number;
    currentVersion: number;
    changelog: string | null;
    createdAt: string;
    changes: {
      nodes: {
        added: WorkflowNode[];
        removed: WorkflowNode[];
        modified: Array<{ current: WorkflowNode; previous: WorkflowNode }>;
      };
      edges: {
        added: WorkflowEdge[];
        removed: WorkflowEdge[];
      };
    };
  }> {
    return api.get(`/workflows/${id}/versions/${versionId}/diff`);
  },

  async exportWorkflow(id: string): Promise<{
    version: string;
    exportedAt: string;
    workflow: {
      name: string;
      description: string | null;
      graph: WorkflowGraph;
      settings: Record<string, any> | null;
    };
  }> {
    return api.get(`/workflows/${id}/export`);
  },

  async importWorkflow(data: any): Promise<Workflow> {
    return api.post<Workflow>('/workflows/import', data);
  },
};
