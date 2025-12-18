import { api } from './client';

// ============================================================================
// COMMENTS
// ============================================================================

export interface Comment {
  id: string;
  workflowId: string;
  nodeId: string | null;
  authorId: string;
  content: string;
  resolved: boolean;
  parentId: string | null;
  position: { x: number; y: number } | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
  replies?: Comment[];
}

export interface CreateCommentRequest {
  workflowId: string;
  nodeId?: string;
  content: string;
  parentId?: string;
  position?: { x: number; y: number };
}

export interface UpdateCommentRequest {
  content?: string;
  resolved?: boolean;
  position?: { x: number; y: number };
}

export const commentsApi = {
  async getByWorkflow(
    workflowId: string,
    params?: { nodeId?: string; resolved?: boolean }
  ): Promise<Comment[]> {
    const searchParams = new URLSearchParams();
    if (params?.nodeId) searchParams.set('nodeId', params.nodeId);
    if (params?.resolved !== undefined) searchParams.set('resolved', String(params.resolved));
    const query = searchParams.toString();
    return api.get<Comment[]>(`/comments/workflow/${workflowId}${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Comment> {
    return api.get<Comment>(`/comments/${id}`);
  },

  async create(data: CreateCommentRequest): Promise<Comment> {
    return api.post<Comment>('/comments', data);
  },

  async update(id: string, data: UpdateCommentRequest): Promise<Comment> {
    return api.put<Comment>(`/comments/${id}`, data);
  },

  async resolve(id: string): Promise<Comment> {
    return api.put<Comment>(`/comments/${id}/resolve`);
  },

  async unresolve(id: string): Promise<Comment> {
    return api.put<Comment>(`/comments/${id}/unresolve`);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/comments/${id}`);
  },
};

// ============================================================================
// TAGS
// ============================================================================

export interface Tag {
  id: string;
  name: string;
  color: string;
  teamId: string;
  createdAt: string;
  _count?: {
    workflows: number;
  };
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateTagRequest {
  name?: string;
  color?: string;
}

export interface WorkflowTag {
  workflowId: string;
  tagId: string;
  assignedAt: string;
  tag: Tag;
}

export const tagsApi = {
  async getByTeam(teamId: string, search?: string): Promise<Tag[]> {
    const searchParams = new URLSearchParams();
    if (search) searchParams.set('search', search);
    const query = searchParams.toString();
    return api.get<Tag[]>(`/teams/${teamId}/tags${query ? `?${query}` : ''}`);
  },

  async getById(teamId: string, id: string): Promise<Tag> {
    return api.get<Tag>(`/teams/${teamId}/tags/${id}`);
  },

  async create(teamId: string, data: CreateTagRequest): Promise<Tag> {
    return api.post<Tag>(`/teams/${teamId}/tags`, data);
  },

  async update(teamId: string, id: string, data: UpdateTagRequest): Promise<Tag> {
    return api.put<Tag>(`/teams/${teamId}/tags/${id}`, data);
  },

  async delete(teamId: string, id: string): Promise<void> {
    await api.delete(`/teams/${teamId}/tags/${id}`);
  },

  async assignToWorkflow(teamId: string, workflowId: string, tagId: string): Promise<WorkflowTag> {
    return api.post<WorkflowTag>(`/teams/${teamId}/tags/assign`, { workflowId, tagId });
  },

  async removeFromWorkflow(teamId: string, workflowId: string, tagId: string): Promise<void> {
    await api.delete(`/teams/${teamId}/tags/workflow/${workflowId}/tag/${tagId}`);
  },

  async getWorkflowTags(teamId: string, workflowId: string): Promise<WorkflowTag[]> {
    return api.get<WorkflowTag[]>(`/teams/${teamId}/tags/workflow/${workflowId}`);
  },
};

// ============================================================================
// TEMPLATES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  graph: any;
  settings: any;
  isPublic: boolean;
  teamId: string | null;
  createdById: string | null;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
  };
  team?: {
    id: string;
    name: string;
  };
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category: string;
  icon?: string;
  graph: any;
  settings?: any;
  isPublic?: boolean;
}

export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  graph?: any;
  settings?: any;
  isPublic?: boolean;
}

export interface TemplateListResponse {
  data: Template[];
  total: number;
  page: number;
  pageSize: number;
}

export const templatesApi = {
  async list(params?: {
    teamId?: string;
    category?: string;
    search?: string;
    publicOnly?: boolean;
    skip?: number;
    take?: number;
  }): Promise<TemplateListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.teamId) searchParams.set('teamId', params.teamId);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.publicOnly) searchParams.set('publicOnly', 'true');
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());
    const query = searchParams.toString();
    return api.get<TemplateListResponse>(`/templates${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Template> {
    return api.get<Template>(`/templates/${id}`);
  },

  async create(data: CreateTemplateRequest, teamId?: string): Promise<Template> {
    const query = teamId ? `?teamId=${teamId}` : '';
    return api.post<Template>(`/templates${query}`, data);
  },

  async update(id: string, data: UpdateTemplateRequest): Promise<Template> {
    return api.put<Template>(`/templates/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/templates/${id}`);
  },

  async getCategories(): Promise<Array<{ name: string; count: number }>> {
    return api.get('/templates/categories');
  },

  async useTemplate(
    templateId: string,
    teamId: string,
    data: { name: string; description?: string }
  ): Promise<any> {
    return api.post(`/templates/${templateId}/use?teamId=${teamId}`, data);
  },

  async createFromWorkflow(
    workflowId: string,
    data: Partial<CreateTemplateRequest>
  ): Promise<Template> {
    return api.post<Template>(`/templates/from-workflow/${workflowId}`, data);
  },
};
