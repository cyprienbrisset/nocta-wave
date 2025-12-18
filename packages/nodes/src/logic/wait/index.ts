import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const WaitSchema = z.object({
  duration: z.number().min(0).max(3600000).default(1000),
  unit: z.enum(['ms', 's', 'm']).default('ms'),
});

export type WaitConfig = z.infer<typeof WaitSchema>;

export const waitNode: NodeDefinition = createNode(
  {
    type: 'logic.wait',
    category: 'logic',
    name: 'Wait',
    description: 'Pause execution for a specified duration',
    icon: 'Clock',
    inputs: [
      input.number('duration', 'Duration', {
        required: true,
        default: 1000,
        description: 'Time to wait',
      }),
      input.select(
        'unit',
        'Unit',
        [
          { label: 'Milliseconds', value: 'ms' },
          { label: 'Seconds', value: 's' },
          { label: 'Minutes', value: 'm' },
        ],
        { default: 'ms' }
      ),
    ],
    outputs: [output.object('data', 'Input data passed through')],
    defaults: {
      duration: 1000,
      unit: 'ms',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = WaitSchema.parse(nodeInput.config);

    // Convert to milliseconds
    let ms = config.duration;
    if (config.unit === 's') ms *= 1000;
    if (config.unit === 'm') ms *= 60000;

    // Cap at 1 hour
    ms = Math.min(ms, 3600000);

    logger.info(`Wait node: waiting ${ms}ms`);

    await new Promise((resolve) => setTimeout(resolve, ms));

    logger.info('Wait complete');

    return { data: nodeInput.data };
  }
);
