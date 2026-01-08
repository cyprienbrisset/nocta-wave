import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AggregateSchema = z.object({
  operation: z.enum(['sum', 'count', 'avg', 'min', 'max', 'first', 'last', 'collect']).default('collect'),
  fieldName: z.string().optional(),
  outputKey: z.string().default('result'),
});

export type AggregateConfig = z.infer<typeof AggregateSchema>;

export const aggregateNode: NodeDefinition = createNode(
  {
    type: 'transform.aggregate',
    category: 'transform',
    name: 'Aggregate',
    description: 'Aggregate array items with various operations',
    icon: 'Calculator',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Collect All', value: 'collect' },
          { label: 'Count', value: 'count' },
          { label: 'Sum', value: 'sum' },
          { label: 'Average', value: 'avg' },
          { label: 'Minimum', value: 'min' },
          { label: 'Maximum', value: 'max' },
          { label: 'First', value: 'first' },
          { label: 'Last', value: 'last' },
        ],
        { default: 'collect' }
      ),
      input.string('fieldName', 'Field Name', {
        description: 'Field to aggregate (for sum, avg, min, max)',
        placeholder: 'amount',
      }),
      input.string('outputKey', 'Output Key', {
        default: 'result',
        description: 'Key to store the result',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      operation: 'collect',
      outputKey: 'result',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AggregateSchema.parse(nodeInput.config);
    const inputData = nodeInput.data;

    logger.info(`Aggregate node: ${config.operation}`);

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

    let result: unknown;

    switch (config.operation) {
      case 'count':
        result = items.length;
        break;

      case 'sum':
        result = items.reduce((acc: number, item) => {
          const value = config.fieldName
            ? (item as Record<string, unknown>)[config.fieldName]
            : item;
          return acc + (typeof value === 'number' ? value : 0);
        }, 0);
        break;

      case 'avg':
        const sum = items.reduce((acc: number, item) => {
          const value = config.fieldName
            ? (item as Record<string, unknown>)[config.fieldName]
            : item;
          return acc + (typeof value === 'number' ? value : 0);
        }, 0);
        result = items.length > 0 ? (sum as number) / items.length : 0;
        break;

      case 'min':
        result = Math.min(
          ...items.map((item) => {
            const value = config.fieldName
              ? (item as Record<string, unknown>)[config.fieldName]
              : item;
            return typeof value === 'number' ? value : Infinity;
          })
        );
        break;

      case 'max':
        result = Math.max(
          ...items.map((item) => {
            const value = config.fieldName
              ? (item as Record<string, unknown>)[config.fieldName]
              : item;
            return typeof value === 'number' ? value : -Infinity;
          })
        );
        break;

      case 'first':
        result = items[0];
        break;

      case 'last':
        result = items[items.length - 1];
        break;

      case 'collect':
      default:
        result = items;
        break;
    }

    logger.info(`Aggregation complete: ${config.operation}`);

    return {
      data: {
        [config.outputKey]: result,
        operation: config.operation,
        itemCount: items.length,
      },
    };
  }
);
