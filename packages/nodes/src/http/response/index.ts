import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HttpResponseSchema = z.object({
  statusCode: z.number().min(100).max(599).default(200),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  respondWith: z.enum(['json', 'text', 'binary']).default('json'),
});

export type HttpResponseConfig = z.infer<typeof HttpResponseSchema>;

export const httpResponse: NodeDefinition = createNode(
  {
    type: 'http.response',
    category: 'http',
    name: 'HTTP Response',
    description: 'Return an HTTP response (for webhook triggers)',
    icon: 'Send',
    inputs: [
      input.number('statusCode', 'Status Code', {
        default: 200,
        description: 'HTTP status code to return',
      }),
      input.keyValue('headers', 'Headers', {
        description: 'Response headers',
      }),
      input.json('body', 'Body', {
        description: 'Response body',
      }),
      input.select(
        'respondWith',
        'Response Type',
        [
          { label: 'JSON', value: 'json' },
          { label: 'Text', value: 'text' },
          { label: 'Binary', value: 'binary' },
        ],
        { default: 'json' }
      ),
    ],
    outputs: [output.object('response', 'Response configuration')],
    defaults: {
      statusCode: 200,
      respondWith: 'json',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HttpResponseSchema.parse(nodeInput.config);
    const data = nodeInput.data;

    logger.info(`HTTP Response: ${config.statusCode}`);

    // Use input data as body if not explicitly set
    const body = config.body !== undefined ? config.body : data;

    return {
      data: {
        __isHttpResponse: true,
        statusCode: config.statusCode,
        headers: {
          'Content-Type':
            config.respondWith === 'json' ? 'application/json' : 'text/plain',
          ...config.headers,
        },
        body,
        respondWith: config.respondWith,
      },
    };
  }
);
