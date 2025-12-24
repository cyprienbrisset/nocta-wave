// Re-export node types from shared package
export type {
  NodeDefinition,
  NodeRunner,
  NodeInput,
  NodeOutput,
  NodeContext,
  NodeLogger,
  NodeCategory,
  InputDefinition,
  OutputDefinition,
  InputType,
  SelectOption,
  ValidationRule,
  DisplayOptions,
  NodeMetadata,
} from '@ws-flows/shared';

// Additional types for node creation

/**
 * Options for creating a node
 */
export interface CreateNodeOptions {
  type: string;
  category: import('@ws-flows/shared').NodeCategory;
  name: string;
  description: string;
  icon: string;
  version?: string;
  inputs: import('@ws-flows/shared').InputDefinition[];
  outputs: import('@ws-flows/shared').OutputDefinition[];
  credentials?: string[];
  defaults?: Record<string, unknown>;
}

/**
 * Node builder for fluent API
 */
export interface NodeBuilder {
  setType(type: string): NodeBuilder;
  setCategory(category: import('@ws-flows/shared').NodeCategory): NodeBuilder;
  setName(name: string): NodeBuilder;
  setDescription(description: string): NodeBuilder;
  setIcon(icon: string): NodeBuilder;
  setVersion(version: string): NodeBuilder;
  addInput(input: import('@ws-flows/shared').InputDefinition): NodeBuilder;
  addOutput(output: import('@ws-flows/shared').OutputDefinition): NodeBuilder;
  addCredential(credentialType: string): NodeBuilder;
  setDefaults(defaults: Record<string, unknown>): NodeBuilder;
  setRunner(runner: import('@ws-flows/shared').NodeRunner): NodeBuilder;
  build(): import('@ws-flows/shared').NodeDefinition;
}
