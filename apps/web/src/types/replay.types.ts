/**
 * Types for Execution Replay and Visual Debugging
 */

// Replay state and controls
export type ReplaySpeed = 0.25 | 0.5 | 1 | 2 | 4;
export type ReplayState = 'idle' | 'playing' | 'paused' | 'stepping' | 'finished';

export interface ReplayControls {
  state: ReplayState;
  currentStepIndex: number;
  speed: ReplaySpeed;
  isLooping: boolean;
  autoPlay: boolean;
}

// Timeline step with full data
export interface TimelineStep {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime: number;  // timestamp ms
  endTime?: number;
  duration?: number;  // ms
  inputData: unknown;
  outputData: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: {
    retryCount?: number;
    memoryUsage?: number;
    cpuTime?: number;
  };
}

// Execution timeline for replay
export interface ExecutionTimeline {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: 'completed' | 'failed' | 'cancelled' | 'running';
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  steps: TimelineStep[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

// Data diff for before/after comparison
export interface DataDiff {
  path: string;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  oldValue?: unknown;
  newValue?: unknown;
  children?: DataDiff[];
}

export interface StepComparison {
  nodeId: string;
  nodeName: string;
  inputDiff: DataDiff[];
  outputDiff: DataDiff[];
  hasChanges: boolean;
  addedKeys: number;
  removedKeys: number;
  changedKeys: number;
}

// Timeline zoom and view state
export interface TimelineViewState {
  zoomLevel: number;  // 0.1 to 10
  panOffset: number;  // horizontal scroll offset
  selectedRange?: {
    start: number;
    end: number;
  };
  visibleTimeRange: {
    start: number;
    end: number;
  };
  showMinimap: boolean;
  groupByNode: boolean;
}

// Export format options
export type ExportFormat = 'json' | 'csv' | 'html' | 'markdown';

export interface ExportOptions {
  format: ExportFormat;
  includeInputData: boolean;
  includeOutputData: boolean;
  includeErrors: boolean;
  includeMetadata: boolean;
  includeTimestamps: boolean;
  prettyPrint: boolean;
  selectedSteps?: string[];  // step IDs to export, empty = all
}

export interface ExportedData {
  filename: string;
  content: string;
  mimeType: string;
  size: number;
}

// Replay session state
export interface ReplaySession {
  executionId: string;
  timeline: ExecutionTimeline;
  controls: ReplayControls;
  viewState: TimelineViewState;
  selectedStepId: string | null;
  hoveredStepId: string | null;
  comparisonStepId: string | null;  // for before/after comparison
  bookmarks: string[];  // step IDs
  annotations: Record<string, string>;  // step ID -> note
}

// Initial states
export const initialReplayControls: ReplayControls = {
  state: 'idle',
  currentStepIndex: 0,
  speed: 1,
  isLooping: false,
  autoPlay: false,
};

export const initialTimelineViewState: TimelineViewState = {
  zoomLevel: 1,
  panOffset: 0,
  visibleTimeRange: { start: 0, end: 0 },
  showMinimap: true,
  groupByNode: false,
};

// Helper functions
export function createTimelineFromExecution(
  execution: {
    id: string;
    workflowId: string;
    status: string;
    startedAt?: Date | string;
    finishedAt?: Date | string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    logs?: Array<{
      id: string;
      nodeId: string;
      nodeName?: string;
      nodeType?: string;
      status: string;
      inputData?: unknown;
      outputData?: unknown;
      error?: string;
      startedAt?: Date | string;
      finishedAt?: Date | string;
      duration?: number;
      retryCount?: number;
    }>;
  },
  workflowName: string = 'Workflow'
): ExecutionTimeline {
  const startTime = execution.startedAt
    ? new Date(execution.startedAt).getTime()
    : Date.now();
  const endTime = execution.finishedAt
    ? new Date(execution.finishedAt).getTime()
    : undefined;

  const steps: TimelineStep[] = (execution.logs || []).map((log) => ({
    id: log.id,
    nodeId: log.nodeId,
    nodeName: log.nodeName || log.nodeId,
    nodeType: log.nodeType || 'unknown',
    status: mapLogStatus(log.status),
    startTime: log.startedAt ? new Date(log.startedAt).getTime() : startTime,
    endTime: log.finishedAt ? new Date(log.finishedAt).getTime() : undefined,
    duration: log.duration,
    inputData: log.inputData,
    outputData: log.outputData,
    error: log.error ? { message: log.error } : undefined,
    metadata: {
      retryCount: log.retryCount,
    },
  }));

  return {
    executionId: execution.id,
    workflowId: execution.workflowId,
    workflowName,
    status: mapExecutionStatus(execution.status),
    startTime,
    endTime,
    totalDuration: endTime ? endTime - startTime : undefined,
    steps,
    input: execution.input || {},
    output: execution.output,
    error: execution.error,
  };
}

function mapLogStatus(status: string): TimelineStep['status'] {
  const statusMap: Record<string, TimelineStep['status']> = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
  };
  return statusMap[status] || 'pending';
}

function mapExecutionStatus(status: string): ExecutionTimeline['status'] {
  const statusMap: Record<string, ExecutionTimeline['status']> = {
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    RUNNING: 'running',
    PENDING: 'running',
    QUEUED: 'running',
  };
  return statusMap[status] || 'running';
}

// Deep diff utility
export function computeDataDiff(
  oldData: unknown,
  newData: unknown,
  path: string = ''
): DataDiff[] {
  const diffs: DataDiff[] = [];

  if (oldData === newData) {
    return [{ path, type: 'unchanged', oldValue: oldData, newValue: newData }];
  }

  if (oldData === undefined && newData !== undefined) {
    return [{ path, type: 'added', newValue: newData }];
  }

  if (oldData !== undefined && newData === undefined) {
    return [{ path, type: 'removed', oldValue: oldData }];
  }

  const oldType = typeof oldData;
  const newType = typeof newData;

  if (oldType !== newType || Array.isArray(oldData) !== Array.isArray(newData)) {
    return [{ path, type: 'changed', oldValue: oldData, newValue: newData }];
  }

  if (Array.isArray(oldData) && Array.isArray(newData)) {
    const maxLen = Math.max(oldData.length, newData.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = path ? `${path}[${i}]` : `[${i}]`;
      diffs.push(...computeDataDiff(oldData[i], newData[i], childPath));
    }
    return diffs;
  }

  if (oldType === 'object' && oldData !== null && newData !== null) {
    const oldObj = oldData as Record<string, unknown>;
    const newObj = newData as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      diffs.push(...computeDataDiff(oldObj[key], newObj[key], childPath));
    }
    return diffs;
  }

  return [{ path, type: 'changed', oldValue: oldData, newValue: newData }];
}

// Export data formatting
export function formatExportData(
  timeline: ExecutionTimeline,
  options: ExportOptions
): ExportedData {
  const data: Record<string, unknown> = {
    executionId: timeline.executionId,
    workflowId: timeline.workflowId,
    workflowName: timeline.workflowName,
    status: timeline.status,
  };

  if (options.includeTimestamps) {
    data.startTime = new Date(timeline.startTime).toISOString();
    data.endTime = timeline.endTime ? new Date(timeline.endTime).toISOString() : null;
    data.totalDuration = timeline.totalDuration;
  }

  const selectedSteps = options.selectedSteps?.length
    ? timeline.steps.filter((s) => options.selectedSteps!.includes(s.id))
    : timeline.steps;

  data.steps = selectedSteps.map((step) => {
    const stepData: Record<string, unknown> = {
      nodeId: step.nodeId,
      nodeName: step.nodeName,
      nodeType: step.nodeType,
      status: step.status,
    };

    if (options.includeTimestamps) {
      stepData.startTime = new Date(step.startTime).toISOString();
      stepData.endTime = step.endTime ? new Date(step.endTime).toISOString() : null;
      stepData.duration = step.duration;
    }

    if (options.includeInputData) {
      stepData.input = step.inputData;
    }

    if (options.includeOutputData) {
      stepData.output = step.outputData;
    }

    if (options.includeErrors && step.error) {
      stepData.error = step.error;
    }

    if (options.includeMetadata && step.metadata) {
      stepData.metadata = step.metadata;
    }

    return stepData;
  });

  let content: string;
  let mimeType: string;
  let extension: string;

  switch (options.format) {
    case 'csv':
      content = convertToCSV(data.steps as Record<string, unknown>[]);
      mimeType = 'text/csv';
      extension = 'csv';
      break;

    case 'html':
      content = convertToHTML(data, timeline.workflowName);
      mimeType = 'text/html';
      extension = 'html';
      break;

    case 'markdown':
      content = convertToMarkdown(data, timeline.workflowName);
      mimeType = 'text/markdown';
      extension = 'md';
      break;

    case 'json':
    default:
      content = options.prettyPrint
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);
      mimeType = 'application/json';
      extension = 'json';
      break;
  }

  return {
    filename: `execution-${timeline.executionId.slice(0, 8)}.${extension}`,
    content,
    mimeType,
    size: new Blob([content]).size,
  };
}

function convertToCSV(steps: Record<string, unknown>[]): string {
  if (steps.length === 0) return '';

  const firstStep = steps[0];
  if (!firstStep) return '';

  const headers = Object.keys(firstStep);
  const rows = steps.map((step) =>
    headers
      .map((h) => {
        const value = step[h];
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        return `"${String(value ?? '').replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

function convertToHTML(data: Record<string, unknown>, title: string): string {
  const steps = data.steps as Record<string, unknown>[];

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Execution Report: ${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #1a1a2e; }
    .meta { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
    .meta p { margin: 5px 0; }
    .step { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #ccc; }
    .step.completed { border-color: #22c55e; }
    .step.failed { border-color: #ef4444; }
    .step.running { border-color: #3b82f6; }
    .step.pending { border-color: #6b7280; }
    .step h3 { margin: 0 0 10px 0; display: flex; align-items: center; gap: 10px; }
    .status { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .status.completed { background: #dcfce7; color: #166534; }
    .status.failed { background: #fee2e2; color: #991b1b; }
    .status.running { background: #dbeafe; color: #1d4ed8; }
    .data { background: #f8f9fa; padding: 10px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; }
    .error { background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Execution Report: ${title}</h1>
  <div class="meta">
    <p><strong>Execution ID:</strong> ${data.executionId}</p>
    <p><strong>Status:</strong> ${data.status}</p>
    ${data.startTime ? `<p><strong>Started:</strong> ${data.startTime}</p>` : ''}
    ${data.totalDuration ? `<p><strong>Duration:</strong> ${data.totalDuration}ms</p>` : ''}
  </div>
  <h2>Steps</h2>
  ${steps.map((step) => `
    <div class="step ${step.status}">
      <h3>
        ${step.nodeName}
        <span class="status ${step.status}">${step.status}</span>
      </h3>
      <p><strong>Type:</strong> ${step.nodeType} ${step.duration ? `| <strong>Duration:</strong> ${step.duration}ms` : ''}</p>
      ${step.input ? `<h4>Input</h4><div class="data">${JSON.stringify(step.input, null, 2)}</div>` : ''}
      ${step.output ? `<h4>Output</h4><div class="data">${JSON.stringify(step.output, null, 2)}</div>` : ''}
      ${step.error ? `<div class="error"><strong>Error:</strong> ${(step.error as { message: string }).message}</div>` : ''}
    </div>
  `).join('')}
</body>
</html>`;
}

function convertToMarkdown(data: Record<string, unknown>, title: string): string {
  const steps = data.steps as Record<string, unknown>[];

  let md = `# Execution Report: ${title}\n\n`;
  md += `## Summary\n\n`;
  md += `- **Execution ID:** ${data.executionId}\n`;
  md += `- **Status:** ${data.status}\n`;
  if (data.startTime) md += `- **Started:** ${data.startTime}\n`;
  if (data.totalDuration) md += `- **Duration:** ${data.totalDuration}ms\n`;
  md += `\n## Steps\n\n`;

  steps.forEach((step, i) => {
    md += `### ${i + 1}. ${step.nodeName} (${step.status})\n\n`;
    md += `- **Type:** ${step.nodeType}\n`;
    if (step.duration) md += `- **Duration:** ${step.duration}ms\n`;

    if (step.input) {
      md += `\n#### Input\n\`\`\`json\n${JSON.stringify(step.input, null, 2)}\n\`\`\`\n`;
    }

    if (step.output) {
      md += `\n#### Output\n\`\`\`json\n${JSON.stringify(step.output, null, 2)}\n\`\`\`\n`;
    }

    if (step.error) {
      md += `\n> **Error:** ${(step.error as { message: string }).message}\n`;
    }

    md += '\n---\n\n';
  });

  return md;
}
