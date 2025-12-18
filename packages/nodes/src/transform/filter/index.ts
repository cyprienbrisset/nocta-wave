import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const FilterSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  outputKey: z.string().default('items'),
});

export type FilterConfig = z.infer<typeof FilterSchema>;

export const filterNode: NodeDefinition = createNode(
  {
    type: 'transform.filter',
    category: 'transform',
    name: 'Filter',
    description: 'Filter items in an array based on a condition',
    icon: 'Filter',
    inputs: [
      input.code('condition', 'Condition', {
        required: true,
        description:
          'JavaScript expression that returns true/false. Use "item" to reference the current item.',
        placeholder: 'item.status === "active" && item.age >= 18',
      }),
      input.string('outputKey', 'Output Key', {
        default: 'items',
        description: 'Key to store the filtered array',
      }),
    ],
    outputs: [
      output.array('items', 'Filtered array'),
      output.array('rejected', 'Rejected items'),
    ],
    defaults: {
      outputKey: 'items',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = FilterSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info('Filter node: filtering items');

    // Get array from input
    let items: unknown[];
    if (Array.isArray(inputData)) {
      items = inputData;
    } else if (typeof inputData === 'object' && inputData !== null) {
      const data = inputData as Record<string, unknown>;
      const arrayKey = Object.keys(data).find((k) => Array.isArray(data[k]));
      items = arrayKey ? (data[arrayKey] as unknown[]) : [inputData];
    } else {
      items = [inputData];
    }

    // Create filter function
    const filterFn = new Function('item', 'index', `return ${config.condition}`);

    // Filter items
    const accepted: unknown[] = [];
    const rejected: unknown[] = [];

    items.forEach((item, index) => {
      try {
        if (filterFn(item, index)) {
          accepted.push(item);
        } else {
          rejected.push(item);
        }
      } catch (error) {
        logger.error(`Error filtering item at index ${index}`, {
          error: (error as Error).message,
        });
        rejected.push(item);
      }
    });

    logger.info(`Filtered: ${accepted.length} accepted, ${rejected.length} rejected`);

    return {
      data: {
        [config.outputKey]: accepted,
        rejected,
        count: accepted.length,
        rejectedCount: rejected.length,
      },
    };
  }
);
