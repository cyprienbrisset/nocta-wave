import { api } from './client';

export interface Execution {
  id: string;
  workflowId: string;
  triggeredBy: string | null;
  triggerType: 'MANUAL' | 'SCHEDULE' | 'WEBHOOK' | 'API' | 'POLL';
  status: 'PENDING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT';
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  errorMessage: string | null;
  inputData: Record<string, any> | null;
  outputData: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  workflow?: {
    id: string;
    name: string;
    teamId: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
  };
  nodeLogs?: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeType: string;
  nodeName: string | null;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  inputData: Record<string, any> | null;
  outputData: Record<string, any> | null;
  error: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  duration: number | null;
  retryCount: number;
  createdAt: string;
}

export interface ExecutionListResponse {
  data: Execution[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  successRate: string;
  recentExecutions: Array<{
    status: string;
    _count: number;
  }>;
}

export const executionsApi = {
  async list(params?: {
    status?: string;
    skip?: number;
    take?: number;
  }): Promise<ExecutionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());

    const query = searchParams.toString();
    return api.get<ExecutionListResponse>(`/executions${query ? `?${query}` : ''}`);
  },

  async get(id: string): Promise<Execution> {
    return api.get<Execution>(`/executions/${id}`);
  },

  async listByWorkflow(
    workflowId: string,
    params?: {
      status?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<ExecutionListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());

    const query = searchParams.toString();
    return api.get<ExecutionListResponse>(
      `/executions/workflow/${workflowId}${query ? `?${query}` : ''}`,
    );
  },

  async trigger(
    workflowId: string,
    inputData?: Record<string, any>,
  ): Promise<Execution> {
    return api.post<Execution>('/executions/trigger', {
      workflowId,
      inputData,
    });
  },

  async cancel(id: string): Promise<void> {
    await api.post(`/executions/${id}/cancel`);
  },

  async retry(id: string): Promise<Execution> {
    return api.post<Execution>(`/executions/${id}/retry`);
  },

  async getStats(): Promise<ExecutionStats> {
    return api.get<ExecutionStats>('/executions/stats');
  },
};
