import { api } from './client';

export type TemplateDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface TemplateParameter {
  id: string;
  name: string;
  label: string;
  type: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  options?: unknown;
  validation?: unknown;
  order: number;
}

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  order: number;
  _count?: { templates: number };
}

export interface TemplateRating {
  id: string;
  rating: number;
  review?: string;
  userId: string;
  createdAt: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  longDescription?: string;
  category: string;
  categoryId?: string;
  icon?: string;
  thumbnail?: string;
  graph: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags: string[];
  difficulty?: TemplateDifficulty;
  estimatedTime?: number;
  isPublic: boolean;
  isFeatured: boolean;
  isCommunity: boolean;
  usageCount: number;
  avgRating: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  parameters: TemplateParameter[];
  templateCategory?: TemplateCategory;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  ratings?: TemplateRating[];
  _count?: { ratings: number };
}

export interface TemplateGalleryResponse {
  templates: WorkflowTemplate[];
  total: number;
  hasMore: boolean;
}

export interface TemplateGalleryQuery {
  category?: string;
  categoryId?: string;
  search?: string;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  isFeatured?: boolean;
  isCommunity?: boolean;
  sortBy?: 'popular' | 'rating' | 'newest';
  skip?: number;
  take?: number;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  longDescription?: string;
  category: string;
  categoryId?: string;
  icon?: string;
  thumbnail?: string;
  graph: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  estimatedTime?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
  parameters?: Omit<TemplateParameter, 'id'>[];
}

export interface DeployTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface DeployedWorkflow {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export const templatesApi = {
  /**
   * Get template gallery with filtering
   */
  getGallery: async (query?: TemplateGalleryQuery): Promise<TemplateGalleryResponse> => {
    const params = new URLSearchParams();
    if (query?.category) params.set('category', query.category);
    if (query?.categoryId) params.set('categoryId', query.categoryId);
    if (query?.search) params.set('search', query.search);
    if (query?.tags?.length) params.set('tags', query.tags.join(','));
    if (query?.difficulty) params.set('difficulty', query.difficulty);
    if (query?.isFeatured !== undefined) params.set('isFeatured', String(query.isFeatured));
    if (query?.isCommunity !== undefined) params.set('isCommunity', String(query.isCommunity));
    if (query?.sortBy) params.set('sortBy', query.sortBy);
    if (query?.skip !== undefined) params.set('skip', String(query.skip));
    if (query?.take !== undefined) params.set('take', String(query.take));

    const queryString = params.toString();
    return api.get(`/templates/gallery${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Get featured templates
   */
  getFeatured: async (limit?: number): Promise<WorkflowTemplate[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return api.get(`/templates/featured${params}`);
  },

  /**
   * Get template categories
   */
  getCategories: async (): Promise<{
    categories: TemplateCategory[];
    legacyCategories: string[];
  }> => {
    return api.get('/templates/categories');
  },

  /**
   * Get template by ID
   */
  getById: async (id: string): Promise<WorkflowTemplate> => {
    return api.get(`/templates/${id}`);
  },

  /**
   * Create a new template
   */
  create: async (data: CreateTemplateDto): Promise<WorkflowTemplate> => {
    return api.post('/templates', data);
  },

  /**
   * Update a template
   */
  update: async (id: string, data: Partial<CreateTemplateDto>): Promise<WorkflowTemplate> => {
    return api.put(`/templates/${id}`, data);
  },

  /**
   * Deploy a template (create workflow from template)
   */
  deploy: async (data: DeployTemplateDto): Promise<DeployedWorkflow> => {
    return api.post('/templates/deploy', data);
  },

  /**
   * Rate a template
   */
  rate: async (id: string, rating: number, review?: string): Promise<{ success: boolean }> => {
    return api.post(`/templates/${id}/rate`, { rating, review });
  },

  /**
   * Create template from existing workflow
   */
  createFromWorkflow: async (
    workflowId: string,
    data: {
      name: string;
      description?: string;
      category: string;
      isPublic?: boolean;
      parameters?: Omit<TemplateParameter, 'id'>[];
    },
  ): Promise<WorkflowTemplate> => {
    return api.post(`/templates/from-workflow/${workflowId}`, data);
  },

  /**
   * Update template parameters
   */
  updateParameters: async (
    id: string,
    parameters: Omit<TemplateParameter, 'id'>[],
  ): Promise<WorkflowTemplate> => {
    return api.put(`/templates/${id}/parameters`, { parameters });
  },

  /**
   * Delete a template
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    return api.delete(`/templates/${id}`);
  },
};
