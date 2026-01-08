import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const WebhookTriggerSchema = z.object({
  path: z.string().optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('POST'),
  authentication: z.enum(['none', 'basic', 'header']).default('none'),
  responseMode: z.enum(['onReceived', 'lastNode']).default('onReceived'),
});

export type WebhookTriggerConfig = z.infer<typeof WebhookTriggerSchema>;

export const webhookTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.webhook',
    category: 'trigger',
    name: 'Webhook Trigger',
    description: 'Trigger workflow via HTTP webhook endpoint',
    icon: 'Webhook',
    inputs: [
      input.string('path', 'Webhook Path', {
        description: 'Custom path for the webhook (auto-generated if empty)',
        placeholder: '/my-webhook',
      }),
      input.select(
        'method',
        'HTTP Method',
        [
          { label: 'POST', value: 'POST' },
          { label: 'GET', value: 'GET' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
        ],
        { default: 'POST' }
      ),
      input.select(
        'authentication',
        'Authentication',
        [
          { label: 'None', value: 'none' },
          { label: 'Basic Auth', value: 'basic' },
          { label: 'Header Auth', value: 'header' },
        ],
        { default: 'none' }
      ),
      input.select(
        'responseMode',
        'Response Mode',
        [
          { label: 'On Received', value: 'onReceived' },
          { label: 'After Last Node', value: 'lastNode' },
        ],
        { default: 'onReceived', description: 'When to send the response' }
      ),
    ],
    outputs: [output.main({ description: 'Trigger event data' })],
    defaults: {
      method: 'POST',
      authentication: 'none',
      responseMode: 'onReceived',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = WebhookTriggerSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`Webhook trigger activated: ${config.method}`);

    return {
      data: {
        body: data.body || {},
        headers: data.headers || {},
        query: data.query || {},
        triggeredAt: new Date().toISOString(),
        triggerType: 'webhook',
        method: config.method,
      },
    };
  }
);
