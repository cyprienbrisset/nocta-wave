import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

/**
 * Sub-workflow node schema
 * Allows executing another workflow as a reusable component
 */
export const SubWorkflowSchema = z.object({
  subWorkflowId: z.string().min(1),
  versionPinned: z.boolean().default(false),
  pinnedVersion: z.number().optional(),
  inputMapping: z.record(z.any()).default({}),
  outputMapping: z.record(z.string()).default({}),
  waitForCompletion: z.boolean().default(true),
  timeout: z.number().min(1000).max(3600000).default(300000), // 5 min default, max 1 hour
  passParentContext: z.boolean().default(false),
});

export type SubWorkflowConfig = z.infer<typeof SubWorkflowSchema>;

/**
 * Input parameter definition for sub-workflows
 */
export interface SubWorkflowInputParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Output parameter definition for sub-workflows
 */
export interface SubWorkflowOutputParam {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  label: string;
  description?: string;
}

/**
 * Sub-workflow metadata used by the node
 */
export interface SubWorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: number;
  inputSchema: SubWorkflowInputParam[];
  outputSchema: SubWorkflowOutputParam[];
}

/**
 * Sub-workflow node definition
 * This node executes another workflow as a reusable component
 */
export const subWorkflowNode: NodeDefinition = createNode(
  {
    type: 'flow.subworkflow',
    category: 'flow',
    name: 'Sub-Workflow',
    description: 'Execute another workflow as a reusable component',
    icon: 'Workflow',
    inputs: [
      input.string('subWorkflowId', 'Sub-Workflow', {
        required: true,
        description: 'Select the sub-workflow to execute',
        placeholder: 'Select a sub-workflow...',
      }),
      input.boolean('versionPinned', 'Pin Version', {
        default: false,
        description: 'Use a specific version instead of latest',
      }),
      input.number('pinnedVersion', 'Pinned Version', {
        description: 'Version number to use when pinned',
        displayOptions: {
          show: {
            versionPinned: [true],
          },
        },
      }),
      input.json('inputMapping', 'Input Mapping', {
        default: {},
        description: 'Map input data to sub-workflow parameters',
      }),
      input.json('outputMapping', 'Output Mapping', {
        default: {},
        description: 'Map sub-workflow outputs to node outputs',
      }),
      input.boolean('waitForCompletion', 'Wait for Completion', {
        default: true,
        description: 'Wait for sub-workflow to complete before continuing',
      }),
      input.number('timeout', 'Timeout (ms)', {
        default: 300000,
        description: 'Maximum execution time (default: 5 minutes)',
      }),
      input.boolean('passParentContext', 'Pass Parent Context', {
        default: false,
        description: 'Include parent workflow context in sub-workflow execution',
      }),
    ],
    outputs: [
      output.object('output', { description: 'Sub-workflow output data' }),
      output.object('error', { description: 'Error output if execution fails', color: '#ef4444' }),
    ],
    defaults: {
      subWorkflowId: '',
      versionPinned: false,
      inputMapping: {},
      outputMapping: {},
      waitForCompletion: true,
      timeout: 300000,
      passParentContext: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SubWorkflowSchema.parse(nodeInput.config);
    const inputData = nodeInput.data as Record<string, unknown>;

    logger.info(`Sub-workflow node: executing ${config.subWorkflowId}`);

    // Prepare input data based on mapping
    const subWorkflowInput: Record<string, unknown> = {};

    if (Object.keys(config.inputMapping).length > 0) {
      // Use explicit mapping
      for (const [targetKey, sourceValue] of Object.entries(config.inputMapping)) {
        if (typeof sourceValue === 'string' && sourceValue.startsWith('{{') && sourceValue.endsWith('}}')) {
          // Expression: extract value from input data
          const path = sourceValue.slice(2, -2).trim();
          subWorkflowInput[targetKey] = getNestedValue(inputData, path);
        } else {
          // Direct value
          subWorkflowInput[targetKey] = sourceValue;
        }
      }
    } else {
      // Pass all input data as-is
      Object.assign(subWorkflowInput, inputData);
    }

    // Return execution request - actual execution happens in worker
    return {
      data: {
        __isSubWorkflow: true,
        subWorkflowId: config.subWorkflowId,
        versionPinned: config.versionPinned,
        pinnedVersion: config.pinnedVersion,
        inputData: subWorkflowInput,
        outputMapping: config.outputMapping,
        waitForCompletion: config.waitForCompletion,
        timeout: config.timeout,
        passParentContext: config.passParentContext,
        parentContext: config.passParentContext
          ? {
              workflowId: context.workflowId,
              executionId: context.executionId,
            }
          : undefined,
      },
    };
  }
);

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Sub-workflow input node
 * Defines input parameters for a workflow when used as sub-workflow
 */
export const subWorkflowInputNode: NodeDefinition = createNode(
  {
    type: 'flow.subworkflow-input',
    category: 'flow',
    name: 'Sub-Workflow Input',
    description: 'Define input parameters when this workflow is used as a sub-workflow',
    icon: 'ArrowDownToLine',
    inputs: [
      input.string('paramName', 'Parameter Name', {
        required: true,
        description: 'Name of the input parameter',
      }),
      input.select('paramType', 'Parameter Type', [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Object', value: 'object' },
        { label: 'Array', value: 'array' },
        { label: 'Any', value: 'any' },
      ], {
        default: 'any',
        description: 'Type of the input parameter',
      }),
      input.string('label', 'Display Label', {
        description: 'Label shown in the sub-workflow node',
      }),
      input.string('description', 'Description', {
        description: 'Description of what this parameter is for',
      }),
      input.boolean('required', 'Required', {
        default: false,
        description: 'Whether this parameter is required',
      }),
      input.json('defaultValue', 'Default Value', {
        description: 'Default value if not provided',
      }),
    ],
    outputs: [
      output.any('value', { description: 'Input parameter value' }),
    ],
    defaults: {
      paramType: 'any',
      required: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = nodeInput.config as {
      paramName: string;
      paramType: string;
      defaultValue?: unknown;
      __inputData?: Record<string, unknown>; // Injected by worker for sub-workflow execution
    };

    // For sub-workflow execution, input data is passed via config.__inputData
    // For normal execution (trigger data), use nodeInput.data
    const inputData = (config.__inputData || nodeInput.data) as Record<string, unknown>;

    // Get the parameter value from sub-workflow input
    let value = inputData[config.paramName];

    // Use default if not provided
    if (value === undefined && config.defaultValue !== undefined) {
      value = config.defaultValue;
    }

    logger.info(`Sub-workflow input: ${config.paramName} = ${JSON.stringify(value)}`);

    // Return all extracted values for downstream nodes
    return {
      data: {
        [config.paramName]: value,
        ...inputData, // Also pass through all input data
      }
    };
  }
);

/**
 * Sub-workflow output node
 * Defines output parameters for a workflow when used as sub-workflow
 */
export const subWorkflowOutputNode: NodeDefinition = createNode(
  {
    type: 'flow.subworkflow-output',
    category: 'flow',
    name: 'Sub-Workflow Output',
    description: 'Define output parameters when this workflow is used as a sub-workflow',
    icon: 'ArrowUpFromLine',
    inputs: [
      input.string('paramName', 'Parameter Name', {
        required: true,
        description: 'Name of the output parameter',
      }),
      input.select('paramType', 'Parameter Type', [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Object', value: 'object' },
        { label: 'Array', value: 'array' },
        { label: 'Any', value: 'any' },
      ], {
        default: 'any',
        description: 'Type of the output parameter',
      }),
      input.string('label', 'Display Label', {
        description: 'Label shown in the sub-workflow node',
      }),
      input.string('description', 'Description', {
        description: 'Description of what this output represents',
      }),
      input.expression('value', 'Value Expression', {
        description: 'Expression to get the output value',
      }),
    ],
    outputs: [],
    defaults: {
      paramType: 'any',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = nodeInput.config as {
      paramName: string;
      value?: string;
    };

    const inputData = nodeInput.data;

    // Determine output value
    let outputValue = inputData;
    if (config.value) {
      // Expression provided - evaluate it
      // For now, just use the input data
      outputValue = inputData;
    }

    logger.info(`Sub-workflow output: ${config.paramName}`);

    return {
      data: {
        __isSubWorkflowOutput: true,
        paramName: config.paramName,
        value: outputValue,
      },
    };
  }
);
