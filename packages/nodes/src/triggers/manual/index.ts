import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ManualTriggerSchema = z.object({
  testData: z.record(z.unknown()).optional(),
});

export type ManualTriggerConfig = z.infer<typeof ManualTriggerSchema>;

export const manualTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.manual',
    category: 'trigger',
    name: 'Manual Trigger',
    description: 'Start workflow manually via UI or API',
    icon: 'Play',
    inputs: [
      input.json('testData', 'Test Data', {
        description: 'Test data to use when triggering manually',
        placeholder: '{ "key": "value" }',
      }),
    ],
    outputs: [output.object('data', 'Trigger payload data')],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ManualTriggerSchema.parse(nodeInput.config);

    logger.info('Manual trigger activated');

    return {
      data: {
        ...(nodeInput.data as Record<string, unknown>),
        ...config.testData,
        triggeredAt: new Date().toISOString(),
        triggerType: 'manual',
      },
    };
  }
);
