// Execution Types

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type TriggerType = 'manual' | 'cron' | 'webhook' | 'http';

export interface Execution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggerType: TriggerType;
  triggerRunId?: string; // Trigger.dev run ID
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt?: Date;
  endedAt?: Date;
  createdAt: Date;
}

export interface ExecutionLog {
  id: string;
  executionId: string;
  nodeId: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface ExecutionWithLogs extends Execution {
  logs: ExecutionLog[];
  steps?: ExecutionStep[];
}

export interface ExecutionStep {
  nodeId: string;
  nodeName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  input?: unknown;
  output?: unknown;
  error?: string;
  duration?: number;
  startedAt?: Date;
  endedAt?: Date;
}

// Execution summary for list view
export interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersion: number;
  status: ExecutionStatus;
  triggerType: TriggerType;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

// WebSocket events
export interface ExecutionStartEvent {
  executionId: string;
  workflowId: string;
  status: 'RUNNING';
  startedAt: string;
}

export interface ExecutionLogEvent {
  executionId: string;
  log: {
    nodeId: string;
    level: LogLevel;
    message: string;
    data?: Record<string, unknown>;
    timestamp: string;
  };
}

export interface ExecutionStepEvent {
  executionId: string;
  step: {
    nodeId: string;
    status: ExecutionStep['status'];
    output?: unknown;
    error?: string;
    duration: number;
  };
}

export interface ExecutionCompleteEvent {
  executionId: string;
  status: ExecutionStatus;
  output?: Record<string, unknown>;
  error?: string;
  endedAt: string;
}
