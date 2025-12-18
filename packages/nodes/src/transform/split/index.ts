import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SplitSchema = z.object({
  fieldName: z.string().default('items'),
  includeIndex: z.boolean().default(true),
});

export type SplitConfig = z.infer<typeof SplitSchema>;

export const splitNode: NodeDefinition = createNode(
  {
    type: 'transform.split',
    category: 'transform',
    name: 'Split',
    description: 'Split an array into individual items for parallel processing',
    icon: 'Split',
    inputs: [
      input.string('fieldName', 'Field Name', {
        default: 'items',
        description: 'Name of the array field to split',
        placeholder: 'items',
      }),
      input.boolean('includeIndex', 'Include Index', {
        default: true,
        description: 'Include the item index in the output',
      }),
    ],
    outputs: [output.object('item', 'Individual item from the array')],
    defaults: {
      fieldName: 'items',
      includeIndex: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SplitSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info(`Split node: splitting ${config.fieldName}`);

    // Get array from input
    let items: unknown[];
    if (Array.isArray(inputData)) {
      items = inputData;
    } else if (typeof inputData === 'object' && inputData !== null) {
      const data = inputData as Record<string, unknown>;
      items = (data[config.fieldName] as unknown[]) || [];
    } else {
      items = [];
    }

    logger.info(`Splitting ${items.length} items`);

    // Return items as array for the executor to handle
    return {
      data: {
        __isSplit: true,
        items: items.map((item, index) => ({
          item,
          ...(config.includeIndex ? { index, total: items.length } : {}),
        })),
        total: items.length,
      },
    };
  }
);
