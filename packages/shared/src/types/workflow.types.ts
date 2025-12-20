// Workflow Types

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  graph: WorkflowGraph;
  teamId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings?: WorkflowSettings;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: NodePosition;
  data: NodeData;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface NodeData {
  label: string;
  icon?: string;
  config: Record<string, unknown>;
  credentials?: string[]; // credential IDs
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  label?: string;
  type?: 'default' | 'conditional';
  condition?: string;
  // Field-level data mappings
  mappings?: EdgeFieldMapping[];
  mappingMeta?: EdgeMappingMeta;
}

// Field mapping for visual data mapping between nodes
export interface EdgeFieldMapping {
  id: string;
  sourcePath: string;     // "output.data.email"
  targetPath: string;     // "config.recipient"
  expression?: string;    // "{{value | lowercase}}" or JS code
  expressionMode: 'simple' | 'advanced';
  createdAt: number;
}

// Metadata about edge mappings
export interface EdgeMappingMeta {
  lastEditedAt: number;
  mappingMode: 'visual' | 'expression' | 'mixed';
}

export interface WorkflowSettings {
  timezone?: string;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  errorHandling?: 'stop' | 'continue';
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
}

// Workflow list item (summary)
export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastExecutionAt?: Date;
  executionCount?: number;
}
