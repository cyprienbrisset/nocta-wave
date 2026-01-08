import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HttpRequestSchema = z.object({
  url: z.string().url('Invalid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).default('GET'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  queryParams: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).default(30000),
  followRedirects: z.boolean().default(true),
  responseType: z.enum(['json', 'text', 'binary']).default('json'),
});

export type HttpRequestConfig = z.infer<typeof HttpRequestSchema>;

export const httpRequest: NodeDefinition = createNode(
  {
    type: 'http.request',
    category: 'http',
    name: 'HTTP Request',
    description: 'Make HTTP requests to any URL',
    icon: 'Globe',
    inputs: [
      input.string('url', 'URL', {
        required: true,
        description: 'The URL to send the request to',
        placeholder: 'https://api.example.com/endpoint',
      }),
      input.select(
        'method',
        'Method',
        [
          { label: 'GET', value: 'GET' },
          { label: 'POST', value: 'POST' },
          { label: 'PUT', value: 'PUT' },
          { label: 'DELETE', value: 'DELETE' },
          { label: 'PATCH', value: 'PATCH' },
          { label: 'HEAD', value: 'HEAD' },
          { label: 'OPTIONS', value: 'OPTIONS' },
        ],
        { required: true, default: 'GET' }
      ),
      input.keyValue('headers', 'Headers', {
        description: 'Request headers',
      }),
      input.keyValue('queryParams', 'Query Parameters', {
        description: 'URL query parameters',
      }),
      input.json('body', 'Body', {
        description: 'Request body (for POST, PUT, PATCH)',
      }),
      input.number('timeout', 'Timeout (ms)', {
        default: 30000,
        description: 'Request timeout in milliseconds',
      }),
      input.boolean('followRedirects', 'Follow Redirects', {
        default: true,
      }),
      input.select(
        'responseType',
        'Response Type',
        [
          { label: 'JSON', value: 'json' },
          { label: 'Text', value: 'text' },
          { label: 'Binary', value: 'binary' },
        ],
        { default: 'json' }
      ),
    ],
    outputs: [output.main({ description: 'HTTP response with status, headers and body' })],
    credentials: ['api_key', 'oauth2', 'basic_auth'],
    defaults: {
      method: 'GET',
      timeout: 30000,
      followRedirects: true,
      responseType: 'json',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HttpRequestSchema.parse(nodeInput.config);

    logger.info(`HTTP Request: ${config.method} ${config.url}`);

    // Build URL with query params
    let url = config.url;
    if (config.queryParams && Object.keys(config.queryParams).length > 0) {
      const params = new URLSearchParams(config.queryParams);
      url += (url.includes('?') ? '&' : '?') + params.toString();
    }

    // Build headers
    const headers: Record<string, string> = {
      ...config.headers,
    };

    // Inject credentials if available
    if (nodeInput.credentials) {
      const cred = nodeInput.credentials;
      if (cred.apiKey) {
        const prefix = (cred.prefix as string) || 'Bearer';
        const headerName = (cred.headerName as string) || 'Authorization';
        headers[headerName] = `${prefix} ${cred.apiKey}`;
      } else if (cred.accessToken) {
        headers['Authorization'] = `Bearer ${cred.accessToken}`;
      } else if (cred.username && cred.password) {
        const encoded = Buffer.from(`${cred.username}:${cred.password}`).toString('base64');
        headers['Authorization'] = `Basic ${encoded}`;
      }
    }

    // Set content type for body
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    const response = await fetch(url, {
      method: config.method,
      headers,
      body:
        config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)
          ? JSON.stringify(config.body)
          : undefined,
      redirect: config.followRedirects ? 'follow' : 'manual',
      signal: AbortSignal.timeout(config.timeout),
    });

    // Parse response based on type
    let body: unknown;
    const contentType = response.headers.get('content-type') || '';

    if (config.responseType === 'json' || contentType.includes('application/json')) {
      try {
        body = await response.json();
      } catch {
        body = await response.text();
      }
    } else if (config.responseType === 'binary') {
      body = await response.arrayBuffer();
    } else {
      body = await response.text();
    }

    const responseHeaders = Object.fromEntries(response.headers.entries());

    logger.info(`Request completed with status ${response.status}`);

    if (response.status >= 400) {
      logger.error(`Request failed`, { status: response.status, body });
    }

    return {
      data: {
        response: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          body,
        },
        statusCode: response.status,
        headers: responseHeaders,
        body,
      },
    };
  }
);
