/**
 * Data Mapping Types
 * Types for the visual data mapping interface between workflow nodes
 */

// Supported data types for auto-detection
export type DataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'date'
  | 'unknown';

// Schema for a data field (inferred or declared)
export interface FieldSchema {
  path: string;           // Full path: "output.data.users[0].name"
  name: string;           // Field name: "name"
  type: DataType;
  isArray: boolean;
  arrayItemType?: DataType;
  children?: FieldSchema[];
  sampleValue?: unknown;
  isRequired?: boolean;
  description?: string;
}

// Node data schema (collected from runtime or declarations)
export interface NodeDataSchema {
  nodeId: string;
  nodeType: string;
  outputSchema: FieldSchema[];
  inputSchema: FieldSchema[];
  lastUpdated: number;
  source: 'runtime' | 'declared' | 'inferred';
}

// Field Mapping - represents a single field-to-field connection
export interface FieldMapping {
  id: string;
  sourcePath: string;     // "output.data.email"
  targetPath: string;     // "config.recipient"
  expression?: string;    // "{{value | lowercase}}" or JS code
  expressionMode: 'simple' | 'advanced';
  createdAt: number;
}

// Edge mappings stored on WorkflowEdge
export interface EdgeMappings {
  mappings: FieldMapping[];
  lastEditedAt: number;
}

// Mapping suggestion
export interface MappingSuggestion {
  id: string;
  sourcePath: string;
  targetPath: string;
  sourceField: FieldSchema;
  targetField: FieldSchema;
  confidence: number;     // 0-1
  reason: MappingSuggestionReason;
  suggestedExpression?: string;
}

export type MappingSuggestionReason =
  | 'exact_name_match'
  | 'similar_name'
  | 'same_type'
  | 'common_pattern'
  | 'previous_mapping';

// Mapping preview result
export interface MappingPreviewResult {
  mappingId: string;
  inputValue: unknown;
  outputValue: unknown;
  success: boolean;
  error?: string;
  executionTime: number;  // ms
}

// Drag state for visual mapping
export interface MappingDragState {
  isDragging: boolean;
  sourceField: FieldSchema | null;
  sourceNodeId: string | null;
  currentPosition: { x: number; y: number } | null;
  validDropTargets: string[];
}

// Mapping state for the store
export interface MappingState {
  mappingModalEdgeId: string | null;
  schemas: Record<string, NodeDataSchema>;
  activeMappingId: string | null;
  expressionMode: 'simple' | 'advanced';
  dragState: MappingDragState;
  previewResults: Record<string, MappingPreviewResult>;
  suggestions: MappingSuggestion[];
}

// Initial mapping state
export const initialMappingState: MappingState = {
  mappingModalEdgeId: null,
  schemas: {},
  activeMappingId: null,
  expressionMode: 'simple',
  dragState: {
    isDragging: false,
    sourceField: null,
    sourceNodeId: null,
    currentPosition: null,
    validDropTargets: [],
  },
  previewResults: {},
  suggestions: [],
};

// Type colors for UI
export const typeColors: Record<DataType, string> = {
  string: '#22c55e',    // Green
  number: '#3b82f6',    // Blue
  boolean: '#f97316',   // Orange
  object: '#a855f7',    // Purple
  array: '#06b6d4',     // Cyan
  null: '#6b7280',      // Gray
  date: '#ec4899',      // Pink
  unknown: '#6b7280',   // Gray
};

// Type labels for UI
export const typeLabels: Record<DataType, string> = {
  string: 'string',
  number: 'number',
  boolean: 'bool',
  object: 'object',
  array: 'array',
  null: 'null',
  date: 'date',
  unknown: '?',
};

// Helper to infer type from a value
export function inferDataType(value: unknown): DataType {
  if (value === null) return 'null';
  if (value === undefined) return 'unknown';
  if (Array.isArray(value)) return 'array';

  const type = typeof value;

  if (type === 'string') {
    // Check if it's a date string
    if (/^\d{4}-\d{2}-\d{2}/.test(value as string)) {
      return 'date';
    }
    return 'string';
  }

  if (type === 'number') return 'number';
  if (type === 'boolean') return 'boolean';
  if (type === 'object') return 'object';

  return 'unknown';
}

// Helper to check if two types are compatible for mapping
export function areTypesCompatible(source: DataType, target: DataType): boolean {
  // Same type is always compatible
  if (source === target) return true;

  // Unknown can be mapped to anything
  if (source === 'unknown' || target === 'unknown') return true;

  // String can accept most types (will be converted)
  if (target === 'string') return true;

  // Number can accept string (if parseable)
  if (target === 'number' && source === 'string') return true;

  // Date can accept string
  if (target === 'date' && source === 'string') return true;

  // Boolean can accept string or number
  if (target === 'boolean' && (source === 'string' || source === 'number')) return true;

  return false;
}
