import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MergeSchema = z.object({
  mode: z.enum(['append', 'merge', 'keepFirst', 'keepLast']).default('merge'),
  mergeKey: z.string().optional(),
});

export type MergeConfig = z.infer<typeof MergeSchema>;

export const mergeNode: NodeDefinition = createNode(
  {
    type: 'transform.merge',
    category: 'transform',
    name: 'Merge',
    description: 'Merge multiple inputs into one',
    icon: 'Merge',
    inputs: [
      input.select(
        'mode',
        'Merge Mode',
        [
          { label: 'Deep Merge', value: 'merge' },
          { label: 'Append Arrays', value: 'append' },
          { label: 'Keep First', value: 'keepFirst' },
          { label: 'Keep Last', value: 'keepLast' },
        ],
        { default: 'merge' }
      ),
      input.string('mergeKey', 'Merge Key', {
        description: 'Key to use for merging arrays of objects (e.g., "id")',
        placeholder: 'id',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      mode: 'merge',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MergeSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info(`Merge node: ${config.mode} mode`);

    // Handle array of inputs (from multiple connections)
    if (!Array.isArray(inputData)) {
      return { data: inputData };
    }

    const inputs = inputData as unknown[];

    if (inputs.length === 0) {
      return { data: {} };
    }

    if (inputs.length === 1) {
      return { data: inputs[0] };
    }

    let result: unknown;

    switch (config.mode) {
      case 'keepFirst':
        result = inputs[0];
        break;

      case 'keepLast':
        result = inputs[inputs.length - 1];
        break;

      case 'append':
        // Concatenate arrays
        result = inputs.flat();
        break;

      case 'merge':
      default:
        // Deep merge objects
        result = inputs.reduce((acc, curr) => {
          if (typeof acc !== 'object' || typeof curr !== 'object') {
            return curr;
          }
          return deepMerge(acc as Record<string, unknown>, curr as Record<string, unknown>);
        });
        break;
    }

    return { data: result };
  }
);

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const output = { ...target };
  for (const key in source) {
    if (source[key] !== undefined) {
      if (
        typeof source[key] === 'object' &&
        source[key] !== null &&
        !Array.isArray(source[key]) &&
        typeof target[key] === 'object' &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        output[key] = deepMerge(
          target[key] as Record<string, unknown>,
          source[key] as Record<string, unknown>
        );
      } else {
        output[key] = source[key];
      }
    }
  }
  return output;
}
