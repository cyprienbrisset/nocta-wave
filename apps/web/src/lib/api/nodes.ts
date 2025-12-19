import { api } from './client';

export interface NodeMetadata {
  type: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  version?: string;
  credentials?: string[];
  defaults?: Record<string, unknown>;
}

export interface NodeDefinition extends NodeMetadata {
  inputs: InputDefinition[];
  outputs: OutputDefinition[];
  defaults?: Record<string, any>;
}

export interface InputDefinition {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  default?: any;
  description?: string;
  placeholder?: string;
  options?: Array<{ label: string; value: string | number | boolean }>;
}

export interface OutputDefinition {
  name: string;
  type: string;
  label?: string;
  description?: string;
  color?: string;
}

export interface NodeCategory {
  category: string;
  count: number;
  nodes: NodeMetadata[];
}

export interface NodeCounts {
  trigger: number;
  http: number;
  transform: number;
  logic: number;
  database: number;
  integration: number;
  utility: number;
  flow: number;
  total: number;
}

export const nodesApi = {
  async list(): Promise<NodeMetadata[]> {
    return api.get<NodeMetadata[]>('/nodes');
  },

  async getByCategory(): Promise<NodeCategory[]> {
    return api.get<NodeCategory[]>('/nodes/categories');
  },

  async getCounts(): Promise<NodeCounts> {
    return api.get<NodeCounts>('/nodes/counts');
  },

  async search(query: string): Promise<NodeMetadata[]> {
    return api.get<NodeMetadata[]>(`/nodes/search?q=${encodeURIComponent(query)}`);
  },

  async getByType(type: string): Promise<NodeDefinition> {
    return api.get<NodeDefinition>(`/nodes/${encodeURIComponent(type)}`);
  },
};
