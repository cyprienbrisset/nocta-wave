import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DelaySchema = z.object({
  duration: z.number().min(0).max(86400000).default(1000),
  unit: z.enum(['ms', 's', 'm', 'h']).default('s'),
});

export const delayNode: NodeDefinition = createNode(
  {
    type: 'utility.delay',
    category: 'utility',
    name: 'Delay',
    description: 'Pause workflow execution for a specified time',
    icon: 'Timer',
    inputs: [
      input.number('duration', 'Duration', { required: true, default: 1, description: 'Time to wait' }),
      input.select('unit', 'Unit', [
        { label: 'Milliseconds', value: 'ms' },
        { label: 'Seconds', value: 's' },
        { label: 'Minutes', value: 'm' },
        { label: 'Hours', value: 'h' },
      ], { default: 's' }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: { duration: 1, unit: 's' },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DelaySchema.parse(nodeInput.config);

    let ms = config.duration;
    if (config.unit === 's') ms *= 1000;
    if (config.unit === 'm') ms *= 60000;
    if (config.unit === 'h') ms *= 3600000;

    ms = Math.min(ms, 86400000); // Cap at 24 hours

    logger.info(`Delay: waiting ${ms}ms`);
    await new Promise((resolve) => setTimeout(resolve, ms));
    logger.info('Delay complete');

    return { data: nodeInput.data };
  }
);
