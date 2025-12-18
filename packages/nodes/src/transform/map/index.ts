import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MapSchema = z.object({
  expression: z.string().min(1, 'Expression is required'),
  outputKey: z.string().default('items'),
});

export type MapConfig = z.infer<typeof MapSchema>;

export const mapNode: NodeDefinition = createNode(
  {
    type: 'transform.map',
    category: 'transform',
    name: 'Map',
    description: 'Transform each item in an array using an expression',
    icon: 'Map',
    inputs: [
      input.code('expression', 'Expression', {
        required: true,
        description:
          'JavaScript expression to transform each item. Use "item" to reference the current item.',
        placeholder: '({ ...item, fullName: item.firstName + " " + item.lastName })',
      }),
      input.string('outputKey', 'Output Key', {
        default: 'items',
        description: 'Key to store the result array',
      }),
    ],
    outputs: [output.array('items', 'Transformed array')],
    defaults: {
      outputKey: 'items',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = MapSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info('Map node: transforming items');

    // Get array from input
    let items: unknown[];
    if (Array.isArray(inputData)) {
      items = inputData;
    } else if (typeof inputData === 'object' && inputData !== null) {
      // Try to find an array in the input
      const data = inputData as Record<string, unknown>;
      const arrayKey = Object.keys(data).find((k) => Array.isArray(data[k]));
      items = arrayKey ? (data[arrayKey] as unknown[]) : [inputData];
    } else {
      items = [inputData];
    }

    // Create transform function
    const transformFn = new Function('item', 'index', `return ${config.expression}`);

    // Map items
    const result = items.map((item, index) => {
      try {
        return transformFn(item, index);
      } catch (error) {
        logger.error(`Error transforming item at index ${index}`, {
          error: (error as Error).message,
        });
        return item;
      }
    });

    logger.info(`Mapped ${result.length} items`);

    return {
      data: {
        [config.outputKey]: result,
      },
    };
  }
);
