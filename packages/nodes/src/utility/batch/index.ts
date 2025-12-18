import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const BatchNodeSchema = z.object({
  operation: z.enum(['chunk', 'collect', 'process', 'aggregate', 'window']).default('chunk'),
  items: z.array(z.any()).optional(),
  batchSize: z.number().min(1).default(10),
  maxBatches: z.number().optional(),
  timeout: z.number().optional(),
  timeoutUnit: z.enum(['milliseconds', 'seconds', 'minutes']).default('seconds'),
  windowSize: z.number().optional(),
  windowType: z.enum(['count', 'time', 'sliding']).default('count'),
  overlap: z.number().optional(),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'count', 'first', 'last', 'concat']).optional(),
  aggregationField: z.string().optional(),
  preserveOrder: z.boolean().default(true),
  continueOnError: z.boolean().default(false),
  parallel: z.boolean().default(false),
  parallelLimit: z.number().default(5),
  delay: z.number().optional(),
  delayUnit: z.enum(['milliseconds', 'seconds']).default('milliseconds'),
  flatten: z.boolean().default(false),
  filter: z.string().optional(),
  transform: z.string().optional(),
});

export type BatchNodeConfig = z.infer<typeof BatchNodeSchema>;

export const batchNode: NodeDefinition = createNode(
  {
    type: 'utility.batch',
    category: 'utility',
    name: 'Batch',
    description: 'Process items in batches and chunks',
    icon: 'Layers',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Chunk Array', value: 'chunk' },
          { label: 'Collect Items', value: 'collect' },
          { label: 'Process Batches', value: 'process' },
          { label: 'Aggregate Results', value: 'aggregate' },
          { label: 'Windowed Processing', value: 'window' },
        ],
        { default: 'chunk' }
      ),
      input.json('items', 'Items', {
        description: 'Array of items to process',
        default: [],
      }),
      input.number('batchSize', 'Batch Size', {
        description: 'Items per batch',
        default: 10,
        min: 1,
      }),
      input.number('maxBatches', 'Max Batches', {
        description: 'Maximum number of batches',
      }),
      input.number('timeout', 'Timeout', {
        description: 'Batch collection timeout',
      }),
      input.select(
        'timeoutUnit',
        'Timeout Unit',
        [
          { label: 'Milliseconds', value: 'milliseconds' },
          { label: 'Seconds', value: 'seconds' },
          { label: 'Minutes', value: 'minutes' },
        ],
        { default: 'seconds' }
      ),
      input.number('windowSize', 'Window Size', {
        description: 'Size of processing window',
      }),
      input.select(
        'windowType',
        'Window Type',
        [
          { label: 'Count-based', value: 'count' },
          { label: 'Time-based', value: 'time' },
          { label: 'Sliding Window', value: 'sliding' },
        ],
        { default: 'count' }
      ),
      input.number('overlap', 'Window Overlap', {
        description: 'Overlap between windows',
      }),
      input.select(
        'aggregation',
        'Aggregation',
        [
          { label: 'Sum', value: 'sum' },
          { label: 'Average', value: 'avg' },
          { label: 'Minimum', value: 'min' },
          { label: 'Maximum', value: 'max' },
          { label: 'Count', value: 'count' },
          { label: 'First', value: 'first' },
          { label: 'Last', value: 'last' },
          { label: 'Concatenate', value: 'concat' },
        ],
        { default: 'sum' }
      ),
      input.string('aggregationField', 'Aggregation Field', {
        description: 'Field to aggregate',
        placeholder: 'value',
      }),
      input.boolean('preserveOrder', 'Preserve Order', {
        description: 'Keep original item order',
        default: true,
      }),
      input.boolean('continueOnError', 'Continue On Error', {
        description: 'Continue processing on errors',
        default: false,
      }),
      input.boolean('parallel', 'Parallel Processing', {
        description: 'Process batches in parallel',
        default: false,
      }),
      input.number('parallelLimit', 'Parallel Limit', {
        description: 'Max parallel batches',
        default: 5,
      }),
      input.number('delay', 'Delay Between Batches', {
        description: 'Delay between batch processing',
      }),
      input.select(
        'delayUnit',
        'Delay Unit',
        [
          { label: 'Milliseconds', value: 'milliseconds' },
          { label: 'Seconds', value: 'seconds' },
        ],
        { default: 'milliseconds' }
      ),
      input.boolean('flatten', 'Flatten Results', {
        description: 'Flatten nested results',
        default: false,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('batches', 'Created batches'),
      output.array('results', 'Processed results'),
      output.object('aggregated', 'Aggregated result'),
      output.number('batchCount', 'Number of batches'),
      output.number('itemCount', 'Total items processed'),
      output.object('stats', 'Processing statistics'),
    ],
    defaults: {
      operation: 'chunk',
      batchSize: 10,
      timeoutUnit: 'seconds',
      windowType: 'count',
      aggregation: 'sum',
      preserveOrder: true,
      continueOnError: false,
      parallel: false,
      parallelLimit: 5,
      delayUnit: 'milliseconds',
      flatten: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = BatchNodeSchema.parse(nodeInput.config);

    const items = config.items || [];
    logger.info(`Batch ${config.operation}: ${items.length} items, batch size ${config.batchSize}`);

    switch (config.operation) {
      case 'chunk':
        const batches: any[][] = [];
        for (let i = 0; i < items.length; i += config.batchSize) {
          const batch = items.slice(i, i + config.batchSize);
          if (config.maxBatches && batches.length >= config.maxBatches) break;
          batches.push(batch);
        }
        return {
          data: {
            success: true,
            batches,
            batchCount: batches.length,
            itemCount: items.length,
            stats: {
              totalItems: items.length,
              batchSize: config.batchSize,
              fullBatches: Math.floor(items.length / config.batchSize),
              remainder: items.length % config.batchSize,
            },
          },
        };

      case 'collect':
        return {
          data: {
            success: true,
            batches: [items],
            batchCount: 1,
            itemCount: items.length,
            stats: {
              collected: items.length,
              timeout: config.timeout,
              batchSize: config.batchSize,
            },
          },
        };

      case 'process':
        const processedBatches: any[][] = [];
        const results: any[] = [];
        let processedCount = 0;

        for (let i = 0; i < items.length; i += config.batchSize) {
          const batch = items.slice(i, i + config.batchSize);
          const processedBatch = batch.map((item, idx) => ({
            ...item,
            _processed: true,
            _batchIndex: Math.floor(i / config.batchSize),
            _itemIndex: idx,
          }));
          processedBatches.push(processedBatch);
          results.push(...processedBatch);
          processedCount += batch.length;
        }

        return {
          data: {
            success: true,
            batches: processedBatches,
            results: config.flatten ? results : processedBatches,
            batchCount: processedBatches.length,
            itemCount: processedCount,
            stats: {
              processed: processedCount,
              failed: 0,
              parallel: config.parallel,
            },
          },
        };

      case 'aggregate':
        const field = config.aggregationField || 'value';
        const values = items.map(item => typeof item === 'object' ? item[field] : item).filter(v => v !== undefined);

        let aggregated: any;
        switch (config.aggregation) {
          case 'sum':
            aggregated = values.reduce((a, b) => a + (Number(b) || 0), 0);
            break;
          case 'avg':
            aggregated = values.length ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length : 0;
            break;
          case 'min':
            aggregated = Math.min(...values.map(Number));
            break;
          case 'max':
            aggregated = Math.max(...values.map(Number));
            break;
          case 'count':
            aggregated = values.length;
            break;
          case 'first':
            aggregated = values[0];
            break;
          case 'last':
            aggregated = values[values.length - 1];
            break;
          case 'concat':
            aggregated = values.join('');
            break;
        }

        return {
          data: {
            success: true,
            aggregated: {
              field,
              operation: config.aggregation,
              result: aggregated,
              inputCount: items.length,
              validValues: values.length,
            },
            itemCount: items.length,
          },
        };

      case 'window':
        const windows: any[][] = [];
        const windowSize = config.windowSize || config.batchSize;
        const overlap = config.overlap || 0;
        const step = windowSize - overlap;

        for (let i = 0; i < items.length; i += step) {
          const window = items.slice(i, i + windowSize);
          if (window.length > 0) {
            windows.push(window);
          }
        }

        return {
          data: {
            success: true,
            batches: windows,
            batchCount: windows.length,
            itemCount: items.length,
            stats: {
              windowSize,
              overlap,
              step,
              windowType: config.windowType,
            },
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
