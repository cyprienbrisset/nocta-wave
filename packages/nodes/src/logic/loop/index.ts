import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const LoopSchema = z.object({
  items: z.string().default('items'),
  batchSize: z.number().min(1).default(1),
  maxIterations: z.number().min(1).max(10000).default(1000),
});

export type LoopConfig = z.infer<typeof LoopSchema>;

export const loopNode: NodeDefinition = createNode(
  {
    type: 'logic.loop',
    category: 'logic',
    name: 'Loop',
    description: 'Iterate over items and execute connected nodes for each',
    icon: 'Repeat',
    inputs: [
      input.string('items', 'Items Field', {
        default: 'items',
        description: 'Field containing the array to iterate over',
        placeholder: 'items',
      }),
      input.number('batchSize', 'Batch Size', {
        default: 1,
        description: 'Number of items to process per iteration',
      }),
      input.number('maxIterations', 'Max Iterations', {
        default: 1000,
        description: 'Maximum number of iterations (safety limit)',
      }),
    ],
    outputs: [
      output.object('item', 'Current item in iteration'),
      output.object('done', 'Output when loop is complete'),
    ],
    defaults: {
      items: 'items',
      batchSize: 1,
      maxIterations: 1000,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = LoopSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info('Loop node: preparing iteration');

    // Get items array
    let items: unknown[];
    if (Array.isArray(inputData)) {
      items = inputData;
    } else if (typeof inputData === 'object' && inputData !== null) {
      const data = inputData as Record<string, unknown>;
      items = (data[config.items] as unknown[]) || [];
    } else {
      items = [];
    }

    // Limit iterations
    const limitedItems = items.slice(0, config.maxIterations);

    logger.info(`Loop: ${limitedItems.length} items to process`);

    return {
      data: {
        __isLoop: true,
        items: limitedItems,
        batchSize: config.batchSize,
        total: limitedItems.length,
      },
    };
  }
);
