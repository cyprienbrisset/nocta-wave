import { api } from './client';

export type VariableType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'SECRET';
export type PromotionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export interface Environment {
  id: string;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order: number;
  isDefault: boolean;
  isProduction: boolean;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  variables?: EnvironmentVariable[];
  _count?: {
    variables: number;
  };
}

export interface Variable {
  id: string;
  name: string;
  description?: string;
  type: VariableType;
  isSecret: boolean;
  teamId: string;
  createdAt: string;
  updatedAt: string;
  environmentValues?: EnvironmentVariable[];
}

export interface EnvironmentVariable {
  id: string;
  environmentId: string;
  variableId: string;
  value: string;
  encryptedValue?: string;
  createdAt: string;
  updatedAt: string;
  environment?: Environment;
  variable?: Variable;
}

export interface EnvironmentPromotion {
  id: string;
  sourceEnvId: string;
  targetEnvId: string;
  variableIds: string[];
  status: PromotionStatus;
  requestedById: string;
  approvedById?: string;
  appliedAt?: string;
  createdAt: string;
  sourceEnv?: Environment;
  targetEnv?: Environment;
  requestedBy?: {
    id: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    name: string;
  };
}

export interface CreateEnvironmentDto {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order?: number;
  isDefault?: boolean;
  isProduction?: boolean;
}

export interface CreateVariableDto {
  key: string;
  description?: string;
  type?: VariableType;
  isSecret?: boolean;
  isGlobal?: boolean;
  values?: Array<{
    environmentId: string;
    value: string;
  }>;
}

export interface SetVariableValueDto {
  variableId: string;
  environmentId: string;
  value: string;
}

export interface PromoteVariablesDto {
  sourceEnvId: string;
  targetEnvId: string;
  variableIds: string[];
}

export interface VariableWithValues extends Variable {
  values: Record<string, string>; // environmentId -> value
}

export const environmentsApi = {
  /**
   * Get all environments for the team
   */
  getEnvironments: async (): Promise<Environment[]> => {
    return api.get('/environments');
  },

  /**
   * Get environment by ID
   */
  getEnvironment: async (id: string): Promise<Environment> => {
    return api.get(`/environments/${id}`);
  },

  /**
   * Create a new environment
   */
  createEnvironment: async (data: CreateEnvironmentDto): Promise<Environment> => {
    return api.post('/environments', data);
  },

  /**
   * Update an environment
   */
  updateEnvironment: async (id: string, data: Partial<CreateEnvironmentDto>): Promise<Environment> => {
    return api.put(`/environments/${id}`, data);
  },

  /**
   * Delete an environment
   */
  deleteEnvironment: async (id: string): Promise<{ success: boolean }> => {
    return api.delete(`/environments/${id}`);
  },

  /**
   * Get all variables with their values
   */
  getVariables: async (): Promise<VariableWithValues[]> => {
    return api.get('/environments/variables');
  },

  /**
   * Create a new variable
   */
  createVariable: async (data: CreateVariableDto): Promise<Variable> => {
    return api.post('/environments/variables', data);
  },

  /**
   * Update a variable
   */
  updateVariable: async (id: string, data: Partial<CreateVariableDto>): Promise<Variable> => {
    return api.put(`/environments/variables/${id}`, data);
  },

  /**
   * Delete a variable
   */
  deleteVariable: async (id: string): Promise<{ success: boolean }> => {
    return api.delete(`/environments/variables/${id}`);
  },

  /**
   * Set variable value for an environment
   */
  setVariableValue: async (data: SetVariableValueDto): Promise<EnvironmentVariable> => {
    return api.post(`/environments/variables/${data.variableId}/value`, {
      environmentId: data.environmentId,
      value: data.value,
    });
  },

  /**
   * Promote variables between environments
   */
  promoteVariables: async (data: PromoteVariablesDto): Promise<EnvironmentPromotion> => {
    return api.post('/environments/promote', data);
  },

  /**
   * Get pending promotions
   */
  getPendingPromotions: async (): Promise<EnvironmentPromotion[]> => {
    return api.get('/environments/promotions');
  },

  /**
   * Approve a promotion
   */
  approvePromotion: async (id: string): Promise<EnvironmentPromotion> => {
    return api.post(`/environments/promotions/${id}/approve`);
  },

  /**
   * Reject a promotion
   */
  rejectPromotion: async (id: string): Promise<EnvironmentPromotion> => {
    return api.post(`/environments/promotions/${id}/reject`);
  },
};
