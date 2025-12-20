import type {
  NodeDefinition,
  NodeRunner,
  NodeCategory,
  InputDefinition,
  OutputDefinition,
  SelectOption,
} from '@ws-flows/shared';
import type { CreateNodeOptions, NodeBuilder } from './types';

/**
 * Create a node definition with a fluent builder API
 */
export function createNodeBuilder(): NodeBuilder {
  const definition: Partial<NodeDefinition> = {
    version: '1.0.0',
    inputs: [],
    outputs: [],
    credentials: [],
    defaults: {},
  };

  const builder: NodeBuilder = {
    setType(type: string) {
      definition.type = type;
      return builder;
    },
    setCategory(category: NodeCategory) {
      definition.category = category;
      return builder;
    },
    setName(name: string) {
      definition.name = name;
      return builder;
    },
    setDescription(description: string) {
      definition.description = description;
      return builder;
    },
    setIcon(icon: string) {
      definition.icon = icon;
      return builder;
    },
    setVersion(version: string) {
      definition.version = version;
      return builder;
    },
    addInput(input: InputDefinition) {
      definition.inputs!.push(input);
      return builder;
    },
    addOutput(output: OutputDefinition) {
      definition.outputs!.push(output);
      return builder;
    },
    addCredential(credentialType: string) {
      definition.credentials!.push(credentialType);
      return builder;
    },
    setDefaults(defaults: Record<string, unknown>) {
      definition.defaults = defaults;
      return builder;
    },
    setRunner(runner: NodeRunner) {
      definition.runner = runner;
      return builder;
    },
    build(): NodeDefinition {
      if (!definition.type) throw new Error('Node type is required');
      if (!definition.category) throw new Error('Node category is required');
      if (!definition.name) throw new Error('Node name is required');
      if (!definition.description) throw new Error('Node description is required');
      if (!definition.icon) throw new Error('Node icon is required');
      if (!definition.runner) throw new Error('Node runner is required');

      return definition as NodeDefinition;
    },
  };

  return builder;
}

/**
 * Create a node definition from options
 */
export function createNode(options: CreateNodeOptions, runner: NodeRunner): NodeDefinition {
  return {
    type: options.type,
    category: options.category,
    name: options.name,
    description: options.description,
    icon: options.icon,
    version: options.version || '1.0.0',
    inputs: options.inputs,
    outputs: options.outputs,
    credentials: options.credentials || [],
    defaults: options.defaults || {},
    runner,
  };
}

/**
 * Helper to create input definitions
 */
export const input = {
  string(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'string',
      label,
      required: false,
      ...options,
    };
  },

  number(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'number',
      label,
      required: false,
      ...options,
    };
  },

  boolean(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'boolean',
      label,
      required: false,
      ...options,
    };
  },

  select(
    name: string,
    label: string,
    selectOptions: SelectOption[],
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label' | 'options'>>
  ): InputDefinition {
    return {
      name,
      type: 'select',
      label,
      options: selectOptions,
      required: false,
      ...options,
    };
  },

  json(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'json',
      label,
      required: false,
      ...options,
    };
  },

  code(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'code',
      label,
      required: false,
      ...options,
    };
  },

  keyValue(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'keyValue',
      label,
      required: false,
      ...options,
    };
  },

  expression(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'expression',
      label,
      required: false,
      ...options,
    };
  },

  credential(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'credential',
      label,
      required: false,
      ...options,
    };
  },

  array(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'json',
      label,
      required: false,
      ...options,
    };
  },

  multiSelect(
    name: string,
    label: string,
    selectOptions: SelectOption[],
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label' | 'options'>>
  ): InputDefinition {
    return {
      name,
      type: 'multiSelect',
      label,
      options: selectOptions,
      required: false,
      ...options,
    };
  },

  text(
    name: string,
    label: string,
    options?: Partial<Omit<InputDefinition, 'name' | 'type' | 'label'>>
  ): InputDefinition {
    return {
      name,
      type: 'string',
      label,
      required: false,
      ...options,
    };
  },
};

interface OutputOptions {
  label?: string;
  description?: string;
  color?: string;
}

/**
 * Helper to create output definitions
 */
export const output = {
  create(name: string, type: string, options?: OutputOptions): OutputDefinition {
    return { name, type, ...options };
  },

  object(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'object', ...opts };
  },

  array(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'array', ...opts };
  },

  string(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'string', ...opts };
  },

  number(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'number', ...opts };
  },

  boolean(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'boolean', ...opts };
  },

  any(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'any', ...opts };
  },

  unknown(name: string, options?: OutputOptions | string): OutputDefinition {
    const opts = typeof options === 'string' ? { description: options } : options;
    return { name, type: 'any', ...opts };
  },

  /** Output for "true" condition branch */
  true(options?: OutputOptions): OutputDefinition {
    return { name: 'true', type: 'object', label: 'Vrai', color: '#22c55e', ...options };
  },

  /** Output for "false" condition branch */
  false(options?: OutputOptions): OutputDefinition {
    return { name: 'false', type: 'object', label: 'Faux', color: '#ef4444', ...options };
  },

  /** Default/fallback output */
  default(options?: OutputOptions): OutputDefinition {
    return { name: 'default', type: 'object', label: 'Défaut', color: '#6b7280', ...options };
  },

  /** Main/primary output */
  main(options?: OutputOptions): OutputDefinition {
    return { name: 'main', type: 'object', label: 'Sortie', ...options };
  },
};
