import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GraphQLSchema = z.object({
  operation: z.enum(['query', 'mutation', 'subscription', 'introspection']).default('query'),
  endpoint: z.string().url(),
  query: z.string(),
  variables: z.record(z.unknown()).optional(),
  operationName: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).default(30000),
  retryOnError: z.boolean().default(false),
  maxRetries: z.number().min(1).max(10).default(3),
  // Advanced options
  batchRequests: z.boolean().default(false),
  batchedQueries: z.array(z.object({
    query: z.string(),
    variables: z.record(z.unknown()).optional(),
    operationName: z.string().optional(),
  })).optional(),
  // Caching
  cacheEnabled: z.boolean().default(false),
  cacheTtlSeconds: z.number().min(1).max(86400).default(300),
  // Persisted queries
  persistedQueryHash: z.string().optional(),
  useAutomaticPersistedQueries: z.boolean().default(false),
});

export const graphqlNode: NodeDefinition = createNode(
  {
    type: 'integration.graphql',
    category: 'integration',
    name: 'GraphQL Client',
    description: 'Execute GraphQL queries, mutations, and subscriptions with full support for variables, batching, and caching',
    icon: 'Braces',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Query', value: 'query', description: 'Fetch data from the server' },
        { label: 'Mutation', value: 'mutation', description: 'Modify data on the server' },
        { label: 'Subscription', value: 'subscription', description: 'Subscribe to real-time updates (WebSocket)' },
        { label: 'Introspection', value: 'introspection', description: 'Get schema information' },
      ], { default: 'query' }),
      input.string('endpoint', 'GraphQL Endpoint', {
        required: true,
        description: 'The GraphQL API endpoint URL',
        placeholder: 'https://api.example.com/graphql',
      }),
      input.code('query', 'Query/Mutation', {
        required: true,
        language: 'graphql',
        description: 'The GraphQL query or mutation to execute',
        placeholder: `query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}`,
      }),
      input.json('variables', 'Variables', {
        description: 'Variables to pass to the query',
        placeholder: '{"id": "123"}',
      }),
      input.string('operationName', 'Operation Name', {
        description: 'Name of the operation to execute (for documents with multiple operations)',
      }),
      input.json('headers', 'Custom Headers', {
        description: 'Additional HTTP headers',
        placeholder: '{"X-Custom-Header": "value"}',
      }),
      input.number('timeout', 'Timeout (ms)', {
        default: 30000,
        description: 'Request timeout in milliseconds',
      }),
      input.boolean('retryOnError', 'Retry on Error', {
        default: false,
        description: 'Automatically retry failed requests',
      }),
      input.number('maxRetries', 'Max Retries', {
        default: 3,
        description: 'Maximum number of retry attempts',
        showWhen: { field: 'retryOnError', equals: true },
      }),
      input.boolean('batchRequests', 'Batch Requests', {
        default: false,
        description: 'Send multiple queries in a single request',
      }),
      input.json('batchedQueries', 'Batched Queries', {
        description: 'Array of queries to batch together',
        showWhen: { field: 'batchRequests', equals: true },
      }),
      input.boolean('cacheEnabled', 'Enable Caching', {
        default: false,
        description: 'Cache query responses',
      }),
      input.number('cacheTtlSeconds', 'Cache TTL (seconds)', {
        default: 300,
        description: 'How long to cache responses',
        showWhen: { field: 'cacheEnabled', equals: true },
      }),
      input.boolean('useAutomaticPersistedQueries', 'Use APQ', {
        default: false,
        description: 'Use Automatic Persisted Queries for reduced bandwidth',
      }),
      input.string('persistedQueryHash', 'Persisted Query Hash', {
        description: 'SHA256 hash for persisted query',
        showWhen: { field: 'useAutomaticPersistedQueries', equals: true },
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    credentials: ['api_key', 'oauth2', 'bearer_token'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GraphQLSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`GraphQL: ${config.operation} to ${config.endpoint}`);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...config.headers,
    };

    // Add auth headers based on credentials
    if (credentials?.bearerToken) {
      headers['Authorization'] = `Bearer ${credentials.bearerToken}`;
    } else if (credentials?.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    }

    // Handle introspection query
    let query = config.query;
    if (config.operation === 'introspection') {
      query = `
        query IntrospectionQuery {
          __schema {
            queryType { name }
            mutationType { name }
            subscriptionType { name }
            types {
              ...FullType
            }
            directives {
              name
              description
              locations
              args { ...InputValue }
            }
          }
        }
        fragment FullType on __Type {
          kind
          name
          description
          fields(includeDeprecated: true) {
            name
            description
            args { ...InputValue }
            type { ...TypeRef }
            isDeprecated
            deprecationReason
          }
          inputFields { ...InputValue }
          interfaces { ...TypeRef }
          enumValues(includeDeprecated: true) {
            name
            description
            isDeprecated
            deprecationReason
          }
          possibleTypes { ...TypeRef }
        }
        fragment InputValue on __InputValue {
          name
          description
          type { ...TypeRef }
          defaultValue
        }
        fragment TypeRef on __Type {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType { kind name }
            }
          }
        }
      `;
    }

    // Handle batched requests
    if (config.batchRequests && config.batchedQueries?.length) {
      const batchPayload = config.batchedQueries.map(bq => ({
        query: bq.query,
        variables: bq.variables,
        operationName: bq.operationName,
      }));

      const response = await fetchWithRetry(
        config.endpoint,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(batchPayload),
        },
        config.retryOnError ? config.maxRetries : 0,
        config.timeout
      );

      const results = await response.json() as Array<{ data?: unknown; errors?: unknown[]; extensions?: unknown }>;
      const responseHeaders = Object.fromEntries(response.headers.entries());

      return {
        data: results.map(r => r.data),
        errors: results.flatMap(r => r.errors || []),
        extensions: results.map(r => r.extensions),
        headers: responseHeaders,
      };
    }

    // Handle APQ (Automatic Persisted Queries)
    let body: Record<string, unknown>;
    if (config.useAutomaticPersistedQueries) {
      const hash = config.persistedQueryHash || await sha256(query);

      // First, try with just the hash
      body = {
        operationName: config.operationName,
        variables: config.variables,
        extensions: {
          persistedQuery: {
            version: 1,
            sha256Hash: hash,
          },
        },
      };

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const result = await response.json() as { data?: unknown; errors?: Array<{ message: string }>; extensions?: unknown };

      // If the server doesn't have the query, send with full query
      if (result.errors?.some(e => e.message.includes('PersistedQueryNotFound'))) {
        body.query = query;
        const retryResponse = await fetch(config.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        const retryResult = await retryResponse.json() as { data?: unknown; errors?: unknown; extensions?: unknown };
        const responseHeaders = Object.fromEntries(retryResponse.headers.entries());

        return {
          data: retryResult.data,
          errors: retryResult.errors,
          extensions: retryResult.extensions,
          headers: responseHeaders,
        };
      }

      const responseHeaders = Object.fromEntries(response.headers.entries());
      return {
        data: result.data,
        errors: result.errors,
        extensions: result.extensions,
        headers: responseHeaders,
      };
    }

    // Standard GraphQL request
    body = {
      query,
      variables: config.variables,
      operationName: config.operationName,
    };

    const response = await fetchWithRetry(
      config.endpoint,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      },
      config.retryOnError ? config.maxRetries : 0,
      config.timeout
    );

    const result = await response.json() as { data?: unknown; errors?: unknown; extensions?: unknown };
    const responseHeaders = Object.fromEntries(response.headers.entries());

    if (result.errors) {
      logger.warn('GraphQL returned errors', { errors: result.errors });
    }

    return {
      data: result.data,
      errors: result.errors,
      extensions: result.extensions,
      headers: responseHeaders,
    };
  }
);

// Helper function for retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number,
  timeout: number
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok && attempt < maxRetries) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Request failed');
}

// Simple SHA256 hash function (for APQ)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
