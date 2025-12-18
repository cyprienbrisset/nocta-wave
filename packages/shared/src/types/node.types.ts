// Node Types - Core SDK Types

export type NodeCategory =
  | 'trigger'
  | 'http'
  | 'transform'
  | 'logic'
  | 'database'
  | 'integration'
  | 'utility';

export type InputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiSelect'
  | 'json'
  | 'code'
  | 'keyValue'
  | 'expression'
  | 'credential';

export interface NodeDefinition {
  /** Unique identifier (e.g., "http.request", "trigger.cron") */
  type: string;
  /** Category for UI grouping */
  category: NodeCategory;
  /** Display name */
  name: string;
  /** Description shown in UI */
  description: string;
  /** Icon name (Lucide icons) */
  icon: string;
  /** Node version */
  version: string;
  /** Input configuration schema */
  inputs: InputDefinition[];
  /** Output schema */
  outputs: OutputDefinition[];
  /** Required credential types (optional) */
  credentials?: string[];
  /** Default config values */
  defaults?: Record<string, unknown>;
  /** The runner function (set at runtime) */
  runner: NodeRunner;
}

export interface InputDefinition {
  name: string;
  type: InputType;
  label: string;
  description?: string;
  required: boolean;
  default?: unknown;
  options?: SelectOption[];
  placeholder?: string;
  validation?: ValidationRule[];
  /** Show this input only when condition is met */
  displayOptions?: DisplayOptions;
  /** Minimum value for number inputs */
  min?: number;
  /** Maximum value for number inputs */
  max?: number;
  /** Item type for array inputs */
  itemType?: string;
  /** Credential types for credential inputs */
  credentialTypes?: string[];
}

export interface OutputDefinition {
  /** Unique identifier for the output handle (used for connections) */
  name: string;
  /** Data type of the output */
  type: string;
  /** Display label for the output */
  label?: string;
  /** Description shown in UI */
  description?: string;
  /** Color for the output handle (optional) */
  color?: string;
}

export interface SelectOption {
  label: string;
  value: string | number | boolean;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
}

export interface DisplayOptions {
  show?: Record<string, unknown[]>;
  hide?: Record<string, unknown[]>;
}

// Node Runner Types
export type NodeRunner = (input: NodeInput, context: NodeContext) => Promise<NodeOutput>;

export interface NodeInput {
  /** Node configuration from UI */
  config: Record<string, unknown>;
  /** Data from previous node */
  data: unknown;
  /** Decrypted credentials (injected at runtime) */
  credentials?: Record<string, unknown>;
}

export interface NodeContext {
  executionId: string;
  workflowId: string;
  nodeId: string;
  logger: NodeLogger;
  /** Trigger.dev step utilities */
  step?: TriggerDevStep;
}

export interface NodeLogger {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface TriggerDevStep {
  run<T>(name: string, fn: () => Promise<T>): Promise<T>;
}

export interface NodeOutput {
  data: unknown;
  meta?: {
    duration?: number;
    [key: string]: unknown;
  };
}

// Node registration
export interface NodeMetadata {
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  icon: string;
  version: string;
  credentials?: string[];
}
