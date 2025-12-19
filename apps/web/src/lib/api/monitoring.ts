import { api } from './client';

// ============================================================================
// TYPES
// ============================================================================

export interface RealTimeMetrics {
  totalExecutions: number;
  runningExecutions: number;
  queuedExecutions: number;
  successRate: number;
  avgDuration: number;
  executionsPerMinute: number;
  queueDepth: number;
  activeWorkflows: number;
  recentErrors: number;
  timestamp: string;
}

export interface MetricSnapshot {
  timestamp: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgDuration: number | null;
  p95Duration: number | null;
  executionsPerMinute: number | null;
  queueDepth: number;
}

export interface PerformanceMetrics {
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  throughput: number;
  period: string;
}

export interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;
  totalExecutions: number;
  successRate: number;
  avgDuration: number;
  lastExecution: string | null;
}

export interface StructuredLog {
  id: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  context?: Record<string, any>;
  workflowId?: string;
  executionId?: string;
  nodeId?: string;
  traceId?: string;
  spanId?: string;
  source?: string;
  tags: string[];
  timestamp: string;
}

export interface LogsResponse {
  data: StructuredLog[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  period: string;
}

export interface TraceSpan {
  id: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'UNSET' | 'OK' | 'ERROR';
  statusMessage?: string;
  attributes?: Record<string, any>;
  events?: any[];
  executionId?: string;
  nodeId?: string;
  children?: TraceSpan[];
}

export interface TraceSummary {
  traceId: string;
  rootSpan: TraceSpan;
  spanCount: number;
  duration: number;
  hasErrors: boolean;
  services: string[];
  startTime: string;
}

export interface TracesResponse {
  data: TraceSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FullTrace {
  traceId: string;
  spans: TraceSpan[];
  tree: TraceSpan[];
  services: string[];
  duration: number;
  hasErrors: boolean;
}

export interface ActiveAlert {
  id: string;
  ruleName: string;
  condition: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  workflowId: string | null;
  workflowName: string | null;
  firedAt: string;
  acknowledged: boolean;
}

// ============================================================================
// API CLIENT
// ============================================================================

export const monitoringApi = {
  // ============================================================================
  // METRICS
  // ============================================================================

  async getRealTimeMetrics(teamId: string): Promise<RealTimeMetrics> {
    return api.get<RealTimeMetrics>(`/teams/${teamId}/monitoring/metrics/realtime`);
  },

  async getMetrics(
    teamId: string,
    params?: {
      startDate?: string;
      endDate?: string;
      period?: 'MINUTE' | 'HOUR' | 'DAY';
      workflowId?: string;
    },
  ): Promise<MetricSnapshot[]> {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.period) searchParams.set('period', params.period);
    if (params?.workflowId) searchParams.set('workflowId', params.workflowId);

    const query = searchParams.toString();
    return api.get<MetricSnapshot[]>(`/teams/${teamId}/monitoring/metrics${query ? `?${query}` : ''}`);
  },

  async getPerformanceMetrics(teamId: string, hours?: number): Promise<PerformanceMetrics> {
    const query = hours ? `?hours=${hours}` : '';
    return api.get<PerformanceMetrics>(`/teams/${teamId}/monitoring/metrics/performance${query}`);
  },

  async getWorkflowMetrics(teamId: string): Promise<WorkflowMetrics[]> {
    return api.get<WorkflowMetrics[]>(`/teams/${teamId}/monitoring/metrics/workflows`);
  },

  // ============================================================================
  // LOGS
  // ============================================================================

  async queryLogs(
    teamId: string,
    params?: {
      query?: string;
      levels?: string[];
      workflowId?: string;
      executionId?: string;
      nodeId?: string;
      traceId?: string;
      startDate?: string;
      endDate?: string;
      skip?: number;
      take?: number;
      tags?: string[];
    },
  ): Promise<LogsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.levels) params.levels.forEach(l => searchParams.append('levels', l));
    if (params?.workflowId) searchParams.set('workflowId', params.workflowId);
    if (params?.executionId) searchParams.set('executionId', params.executionId);
    if (params?.nodeId) searchParams.set('nodeId', params.nodeId);
    if (params?.traceId) searchParams.set('traceId', params.traceId);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());
    if (params?.tags) params.tags.forEach(t => searchParams.append('tags', t));

    const query = searchParams.toString();
    return api.get<LogsResponse>(`/teams/${teamId}/monitoring/logs${query ? `?${query}` : ''}`);
  },

  async getLogStats(teamId: string, hours?: number): Promise<LogStats> {
    const query = hours ? `?hours=${hours}` : '';
    return api.get<LogStats>(`/teams/${teamId}/monitoring/logs/stats${query}`);
  },

  // ============================================================================
  // TRACES
  // ============================================================================

  async queryTraces(
    teamId: string,
    params?: {
      traceId?: string;
      executionId?: string;
      serviceName?: string;
      operationName?: string;
      minDuration?: number;
      hasError?: boolean;
      startDate?: string;
      endDate?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<TracesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.traceId) searchParams.set('traceId', params.traceId);
    if (params?.executionId) searchParams.set('executionId', params.executionId);
    if (params?.serviceName) searchParams.set('serviceName', params.serviceName);
    if (params?.operationName) searchParams.set('operationName', params.operationName);
    if (params?.minDuration) searchParams.set('minDuration', params.minDuration.toString());
    if (params?.hasError !== undefined) searchParams.set('hasError', params.hasError.toString());
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.skip) searchParams.set('skip', params.skip.toString());
    if (params?.take) searchParams.set('take', params.take.toString());

    const query = searchParams.toString();
    return api.get<TracesResponse>(`/teams/${teamId}/monitoring/traces${query ? `?${query}` : ''}`);
  },

  async getTrace(teamId: string, traceId: string): Promise<FullTrace> {
    return api.get<FullTrace>(`/teams/${teamId}/monitoring/traces/${traceId}`);
  },

  // ============================================================================
  // ALERTS
  // ============================================================================

  async getActiveAlerts(teamId: string): Promise<ActiveAlert[]> {
    return api.get<ActiveAlert[]>(`/teams/${teamId}/monitoring/alerts`);
  },

  async acknowledgeAlert(teamId: string, alertId: string): Promise<void> {
    await api.patch(`/teams/${teamId}/monitoring/alerts/${alertId}/acknowledge`);
  },
};
