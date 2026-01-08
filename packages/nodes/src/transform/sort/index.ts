import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const SortSchema = z.object({
  fieldName: z.string().min(1, 'Field name is required'),
  order: z.enum(['asc', 'desc']).default('asc'),
  type: z.enum(['string', 'number', 'date']).default('string'),
  outputKey: z.string().default('items'),
});

export type SortConfig = z.infer<typeof SortSchema>;

export const sortNode: NodeDefinition = createNode(
  {
    type: 'transform.sort',
    category: 'transform',
    name: 'Sort',
    description: 'Sort array items by a field',
    icon: 'ArrowUpDown',
    inputs: [
      input.string('fieldName', 'Sort By', {
        required: true,
        description: 'Field name to sort by',
        placeholder: 'createdAt',
      }),
      input.select(
        'order',
        'Order',
        [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ],
        { default: 'asc' }
      ),
      input.select(
        'type',
        'Value Type',
        [
          { label: 'String', value: 'string' },
          { label: 'Number', value: 'number' },
          { label: 'Date', value: 'date' },
        ],
        { default: 'string' }
      ),
      input.string('outputKey', 'Output Key', {
        default: 'items',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      order: 'asc',
      type: 'string',
      outputKey: 'items',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = SortSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info(`Sort node: ${config.fieldName} ${config.order}`);

    // Get array from input
    let items: unknown[];
    if (Array.isArray(inputData)) {
      items = [...inputData];
    } else if (typeof inputData === 'object' && inputData !== null) {
      const data = inputData as Record<string, unknown>;
      const arrayKey = Object.keys(data).find((k) => Array.isArray(data[k]));
      items = arrayKey ? [...(data[arrayKey] as unknown[])] : [inputData];
    } else {
      items = [inputData];
    }

    // Sort items
    items.sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[config.fieldName];
      const bValue = (b as Record<string, unknown>)[config.fieldName];

      let comparison = 0;

      if (config.type === 'number') {
        comparison = (Number(aValue) || 0) - (Number(bValue) || 0);
      } else if (config.type === 'date') {
        comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return config.order === 'desc' ? -comparison : comparison;
    });

    logger.info(`Sorted ${items.length} items`);

    return {
      data: {
        [config.outputKey]: items,
      },
    };
  }
);
