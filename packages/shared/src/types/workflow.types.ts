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

export interface NodeRetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

export interface NodeData {
  label: string;
  icon?: string;
  config: Record<string, unknown>;
  credentials?: string[]; // credential IDs
  // Runtime properties
  nodeType?: string;
  credentialId?: string;
  retry?: boolean | NodeRetryConfig;
  timeout?: number;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
  continueOnError?: boolean;
  // Allow additional properties for extensibility
  [key: string]: unknown;
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

// ============================================================================
// NODE OUTPUT TYPES
// ============================================================================

/**
 * Result of executing a node, stored in nodeOutputs Map
 */
export interface NodeOutputResult {
  data?: unknown;
  outputHandle?: string;
  __rawOutput?: unknown;
  [key: string]: unknown;
}

// ============================================================================
// VERSION DIFF TYPES
// ============================================================================

export interface WorkflowVersionDiff {
  nodes: {
    added: WorkflowNode[];
    removed: WorkflowNode[];
    modified: NodeModification[];
  };
  edges: {
    added: WorkflowEdge[];
    removed: WorkflowEdge[];
  };
  settings: {
    current: WorkflowSettings | null;
    previous: WorkflowSettings | null;
  };
}

export interface NodeModification {
  id: string;
  field: string;
  before: unknown;
  after: unknown;
}

// ============================================================================
// WORKFLOW WITH TYPED PRISMA FIELDS
// ============================================================================

/**
 * Extended WorkflowGraph with viewport for React Flow
 */
export interface WorkflowGraphWithViewport extends WorkflowGraph {
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Type guard to check if a value is a valid WorkflowGraph
 */
export function isWorkflowGraph(value: unknown): value is WorkflowGraph {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return Array.isArray(obj.nodes) && Array.isArray(obj.edges);
}

/**
 * Type guard to check if a value is valid WorkflowSettings
 */
export function isWorkflowSettings(value: unknown): value is WorkflowSettings {
  if (!value || typeof value !== 'object') return false;
  return true; // All fields are optional
}

/**
 * Safely cast Prisma Json to WorkflowGraph
 */
export function toWorkflowGraph(json: unknown): WorkflowGraph {
  if (isWorkflowGraph(json)) {
    return json;
  }
  // Return empty graph as fallback
  return { nodes: [], edges: [] };
}

/**
 * Safely cast Prisma Json to WorkflowSettings
 */
export function toWorkflowSettings(json: unknown): WorkflowSettings | null {
  if (!json) return null;
  if (isWorkflowSettings(json)) {
    return json;
  }
  return null;
}
