import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SwitchSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  cases: z
    .array(
      z.object({
        value: z.unknown(),
        output: z.string(),
      })
    )
    .default([]),
  defaultOutput: z.string().default('default'),
});

export type SwitchConfig = z.infer<typeof SwitchSchema>;

export const switchNode: NodeDefinition = createNode(
  {
    type: 'logic.switch',
    category: 'logic',
    name: 'Switch',
    description: 'Route to different outputs based on a field value',
    icon: 'Route',
    inputs: [
      input.string('field', 'Field', {
        required: true,
        description: 'Field to evaluate (e.g., "status" or "data.type")',
        placeholder: 'status',
      }),
      input.json('cases', 'Cases', {
        description: 'Array of { value, output } objects',
        placeholder:
          '[{"value": "active", "output": "case_0"}, {"value": "pending", "output": "case_1"}]',
      }),
      input.string('defaultOutput', 'Default Output', {
        default: 'default',
        description: 'Output to use if no case matches',
      }),
    ],
    outputs: [
      output.object('case_0', { label: 'Cas 1', color: '#3b82f6', description: 'Premier cas' }),
      output.object('case_1', { label: 'Cas 2', color: '#8b5cf6', description: 'Deuxième cas' }),
      output.object('case_2', { label: 'Cas 3', color: '#ec4899', description: 'Troisième cas' }),
      output.object('case_3', { label: 'Cas 4', color: '#f97316', description: 'Quatrième cas' }),
      output.default({ description: 'Sortie par défaut si aucun cas ne correspond' }),
    ],
    defaults: {
      defaultOutput: 'default',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SwitchSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`Switch node: evaluating field "${config.field}"`);

    // Get field value
    let fieldValue: unknown = data;
    for (const key of config.field.split('.')) {
      fieldValue = (fieldValue as Record<string, unknown>)?.[key];
    }

    // Find matching case
    let outputHandle = config.defaultOutput;
    for (let i = 0; i < config.cases.length; i++) {
      const c = config.cases[i];
      if (c && fieldValue === c.value) {
        outputHandle = c.output || `case_${i}`;
        break;
      }
    }

    logger.info(`Switch result: ${outputHandle} (value: ${String(fieldValue)})`);

    return {
      data: {
        __isSwitch: true,
        fieldValue,
        data,
        outputHandle,
      },
    };
  }
);
