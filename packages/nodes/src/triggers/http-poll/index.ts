import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HttpPollTriggerSchema = z.object({
  url: z.string().url('Invalid URL'),
  method: z.enum(['GET', 'POST']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  interval: z.number().min(60000).default(300000), // Min 1 minute, default 5 minutes
  responseKey: z.string().optional(),
});

export type HttpPollTriggerConfig = z.infer<typeof HttpPollTriggerSchema>;

export const httpPollTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.http-poll',
    category: 'trigger',
    name: 'HTTP Poll Trigger',
    description: 'Poll an HTTP endpoint at regular intervals',
    icon: 'RefreshCw',
    inputs: [
      input.string('url', 'URL', {
        required: true,
        description: 'URL to poll',
        placeholder: 'https://api.example.com/data',
      }),
      input.select(
        'method',
        'Method',
        [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
        ],
        { default: 'GET' }
      ),
      input.keyValue('headers', 'Headers', {
        description: 'Request headers',
      }),
      input.json('body', 'Body', {
        description: 'Request body (for POST)',
      }),
      input.number('interval', 'Poll Interval (ms)', {
        default: 300000,
        description: 'Polling interval in milliseconds (min: 60000)',
      }),
      input.string('responseKey', 'Response Key', {
        description: 'Key to extract from response (e.g., "data.items")',
        placeholder: 'data.items',
      }),
    ],
    outputs: [output.main({ description: 'Operation result' })],
    credentials: ['api_key', 'basic_auth'],
    defaults: {
      method: 'GET',
      interval: 300000,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HttpPollTriggerSchema.parse(nodeInput.config);

    logger.info(`HTTP Poll trigger: ${config.method} ${config.url}`);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    // Inject credentials if available
    if (nodeInput.credentials) {
      const cred = nodeInput.credentials;
      if (cred.apiKey) {
        const prefix = (cred.prefix as string) || 'Bearer';
        const headerName = (cred.headerName as string) || 'Authorization';
        headers[headerName] = `${prefix} ${cred.apiKey}`;
      } else if (cred.username && cred.password) {
        const encoded = Buffer.from(`${cred.username}:${cred.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
    }

    const response = await fetch(config.url, {
      method: config.method,
      headers,
      body: config.body && config.method === 'POST' ? JSON.stringify(config.body) : undefined,
    });

    let data: unknown = await response.json();

    // Extract nested key if specified
    if (config.responseKey) {
      const keys = config.responseKey.split('.');
      for (const key of keys) {
        data = (data as Record<string, unknown>)?.[key];
      }
    }

    logger.info(`Poll completed with status ${response.status}`);

    return {
      data: {
        response: data,
        status: response.status,
        triggeredAt: new Date().toISOString(),
        triggerType: 'http-poll',
      },
    };
  }
);
