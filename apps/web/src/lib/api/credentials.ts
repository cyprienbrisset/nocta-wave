import { api } from './client';

export type CredentialType = 'API_KEY' | 'OAUTH2' | 'BASIC_AUTH' | 'DATABASE' | 'AWS';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialDto {
  name: string;
  type: CredentialType;
  data: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface UpdateCredentialDto {
  name?: string;
  data?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export const credentialsApi = {
  list: () => api.get<Credential[]>('/credentials'),

  get: (id: string) => api.get<Credential>(`/credentials/${id}`),

  create: (dto: CreateCredentialDto) => api.post<Credential>('/credentials', dto),

  update: (id: string, dto: UpdateCredentialDto) => api.put<Credential>(`/credentials/${id}`, dto),

  delete: (id: string) => api.delete<void>(`/credentials/${id}`),

  test: (id: string) => api.post<{ success: boolean; message?: string }>(`/credentials/${id}/test`),
};
