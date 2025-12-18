import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const StopSchema = z.object({
  message: z.string().optional(),
  status: z.enum(['success', 'error']).default('success'),
});

export type StopConfig = z.infer<typeof StopSchema>;

export const stopNode: NodeDefinition = createNode(
  {
    type: 'logic.stop',
    category: 'logic',
    name: 'Stop',
    description: 'Stop workflow execution',
    icon: 'StopCircle',
    inputs: [
      input.string('message', 'Message', {
        description: 'Optional message to include in the result',
        placeholder: 'Workflow stopped',
      }),
      input.select(
        'status',
        'Status',
        [
          { label: 'Success', value: 'success' },
          { label: 'Error', value: 'error' },
        ],
        { default: 'success' }
      ),
    ],
    outputs: [],
    defaults: {
      status: 'success',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = StopSchema.parse(nodeInput.config);

    logger.info(`Stop node: ${config.status}${config.message ? ` - ${config.message}` : ''}`);

    if (config.status === 'error') {
      throw new Error(config.message || 'Workflow stopped with error');
    }

    return {
      data: {
        __isStop: true,
        status: config.status,
        message: config.message,
        data: nodeInput.data,
      },
    };
  }
);
