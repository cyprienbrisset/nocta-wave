import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const CronTriggerSchema = z.object({
  expression: z.string().min(1, 'Cron expression is required'),
  timezone: z.string().default('UTC'),
});

export type CronTriggerConfig = z.infer<typeof CronTriggerSchema>;

export const cronTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.cron',
    category: 'trigger',
    name: 'Cron Trigger',
    description: 'Trigger workflow on a schedule using cron expressions',
    icon: 'Clock',
    inputs: [
      input.string('expression', 'Cron Expression', {
        required: true,
        description: 'Cron expression (e.g., "0 9 * * *" for every day at 9 AM)',
        placeholder: '0 9 * * *',
      }),
      input.select(
        'timezone',
        'Timezone',
        [
          { label: 'UTC', value: 'UTC' },
          { label: 'America/New_York', value: 'America/New_York' },
          { label: 'America/Los_Angeles', value: 'America/Los_Angeles' },
          { label: 'Europe/London', value: 'Europe/London' },
          { label: 'Europe/Paris', value: 'Europe/Paris' },
          { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
        ],
        { default: 'UTC' }
      ),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    defaults: {
      expression: '0 * * * *',
      timezone: 'UTC',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CronTriggerSchema.parse(nodeInput.config);

    logger.info(`Cron trigger activated: ${config.expression}`);

    return {
      data: {
        triggeredAt: new Date().toISOString(),
        triggerType: 'cron',
        expression: config.expression,
        timezone: config.timezone,
      },
    };
  }
);
