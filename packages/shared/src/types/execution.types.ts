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
  triggerRunId?: string; // Internal run ID
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

// ============================================================================
// PRISMA JSON FIELD TYPES
// ============================================================================

/**
 * Reference to externalized data stored in object storage (S3/MinIO)
 */
export interface DataStorageRef {
  bucket: string;
  key: string;
  size: number;
  compressed: boolean;
  checksum?: string;
  storedAt: string;
}

/**
 * Result from storing execution data (inline or externalized)
 */
export interface DataStorageResult {
  inputData: Record<string, unknown> | null;
  inputDataRef: DataStorageRef | null;
  outputData: Record<string, unknown> | null;
  outputDataRef: DataStorageRef | null;
}

/**
 * Type guard for DataStorageRef
 */
export function isDataStorageRef(value: unknown): value is DataStorageRef {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.bucket === 'string' &&
    typeof obj.key === 'string' &&
    typeof obj.size === 'number'
  );
}

/**
 * Safely extract data or null from Prisma Json
 */
export function toJsonData(json: unknown): Record<string, unknown> | null {
  if (!json) return null;
  if (typeof json === 'object' && !Array.isArray(json)) {
    return json as Record<string, unknown>;
  }
  return null;
}

/**
 * Safely extract DataStorageRef from Prisma Json
 */
export function toDataStorageRef(json: unknown): DataStorageRef | null {
  if (isDataStorageRef(json)) {
    return json;
  }
  return null;
}
