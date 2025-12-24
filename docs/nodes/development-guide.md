# Node Development Guide

## Overview

Nodes are the building blocks of workflows. Each node performs a specific action and can be connected to other nodes to create complex automation flows.

## Node Structure

```
packages/nodes/src/
├── index.ts              # Exports all nodes
├── types.ts              # Shared types
├── registry.ts           # Node registry
│
├── triggers/             # Trigger nodes
│   ├── manual/
│   ├── cron/
│   ├── webhook/
│   └── http/
│
├── http/                 # HTTP nodes
│   ├── request/
│   └── response/
│
├── transform/            # Data transformation
│   ├── map/
│   ├── filter/
│   ├── merge/
│   └── split/
│
├── logic/                # Logic nodes
│   ├── condition/
│   ├── switch/
│   └── loop/
│
└── integrations/         # Third-party integrations
    ├── slack/
    ├── github/
    └── ...
```

## Node Definition

Each node must implement the `NodeDefinition` interface:

```typescript
// packages/nodes/src/types.ts

export interface NodeDefinition {
  // Unique identifier (e.g., "http.request")
  type: string;

  // Category for UI grouping
  category: NodeCategory;

  // Display name
  name: string;

  // Description shown in UI
  description: string;

  // Icon name (Lucide icons)
  icon: string;

  // Input configuration schema
  inputs: InputDefinition[];

  // Output schema
  outputs: OutputDefinition[];

  // Required credential types (optional)
  credentials?: string[];

  // Execution function
  runner: NodeRunner;
}

export type NodeCategory =
  | 'trigger'
  | 'http'
  | 'transform'
  | 'logic'
  | 'database'
  | 'integration'
  | 'utility';

export interface InputDefinition {
  name: string;
  type: InputType;
  label: string;
  description?: string;
  required: boolean;
  default?: unknown;
  options?: SelectOption[];        // For 'select' type
  placeholder?: string;
  validation?: ValidationRule[];
}

export type InputType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiSelect'
  | 'json'
  | 'code'
  | 'keyValue'
  | 'expression';

export interface OutputDefinition {
  name: string;
  type: string;
  description?: string;
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: unknown;
  message: string;
}
```

## Node Runner

The runner is the execution function:

```typescript
export type NodeRunner = (
  input: NodeInput,
  context: NodeContext
) => Promise<NodeOutput>;

export interface NodeInput {
  config: Record<string, unknown>;    // Node configuration
  data: unknown;                       // Data from previous node
  credentials?: Record<string, unknown>;
}

export interface NodeContext {
  executionId: string;
  workflowId: string;
  nodeId: string;
  logger: Logger;
}

export interface NodeOutput {
  data: unknown;
  meta?: {
    duration?: number;
    [key: string]: unknown;
  };
}

export interface Logger {
  debug(message: string, data?: object): void;
  info(message: string, data?: object): void;
  warn(message: string, data?: object): void;
  error(message: string, data?: object): void;
}
```

## Creating a Node

### Step 1: Create the folder structure

```
packages/nodes/src/http/request/
├── index.ts          # Main export
├── definition.ts     # Node metadata
├── runner.ts         # Execution logic
├── schema.ts         # Zod validation schema
└── __tests__/
    └── runner.test.ts
```

### Step 2: Define the schema

```typescript
// packages/nodes/src/http/request/schema.ts

import { z } from 'zod';

export const HttpRequestConfigSchema = z.object({
  url: z.string().url('Must be a valid URL'),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  timeout: z.number().min(1000).max(300000).default(30000),
  followRedirects: z.boolean().default(true),
});

export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;
```

### Step 3: Create the definition

```typescript
// packages/nodes/src/http/request/definition.ts

import { NodeDefinition } from '../../types';

export const httpRequestDefinition: NodeDefinition = {
  type: 'http.request',
  category: 'http',
  name: 'HTTP Request',
  description: 'Make an HTTP request to any URL',
  icon: 'globe',

  inputs: [
    {
      name: 'url',
      type: 'string',
      label: 'URL',
      description: 'The URL to send the request to',
      required: true,
      placeholder: 'https://api.example.com/endpoint',
    },
    {
      name: 'method',
      type: 'select',
      label: 'Method',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
        { label: 'PATCH', value: 'PATCH' },
      ],
    },
    {
      name: 'headers',
      type: 'keyValue',
      label: 'Headers',
      description: 'Request headers',
      required: false,
    },
    {
      name: 'body',
      type: 'json',
      label: 'Body',
      description: 'Request body (for POST, PUT, PATCH)',
      required: false,
    },
    {
      name: 'timeout',
      type: 'number',
      label: 'Timeout (ms)',
      description: 'Request timeout in milliseconds',
      required: false,
      default: 30000,
    },
  ],

  outputs: [
    {
      name: 'response',
      type: 'object',
      description: 'HTTP response with status, headers, and body',
    },
  ],

  credentials: ['api_key', 'oauth2', 'basic_auth'],

  runner: null!, // Set in index.ts
};
```

### Step 4: Implement the runner

```typescript
// packages/nodes/src/http/request/runner.ts

import { NodeRunner, NodeInput, NodeContext, NodeOutput } from '../../types';
import { HttpRequestConfigSchema } from './schema';

export const httpRequestRunner: NodeRunner = async (
  input: NodeInput,
  context: NodeContext
): Promise<NodeOutput> => {
  const { logger } = context;

  // Validate configuration
  const config = HttpRequestConfigSchema.parse(input.config);

  logger.info(`Making ${config.method} request to ${config.url}`);

  const headers: Record<string, string> = {
    ...config.headers,
  };

  // Inject credentials if provided
  if (input.credentials) {
    const cred = input.credentials;
    if (cred.apiKey) {
      const prefix = cred.prefix || 'Bearer';
      const headerName = cred.headerName || 'Authorization';
      headers[headerName] = `${prefix} ${cred.apiKey}`;
    } else if (cred.username && cred.password) {
      const encoded = Buffer.from(
        `${cred.username}:${cred.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${encoded}`;
    }
  }

  const fetchOptions: RequestInit = {
    method: config.method,
    headers,
    redirect: config.followRedirects ? 'follow' : 'manual',
    signal: AbortSignal.timeout(config.timeout),
  };

  if (
    config.body &&
    ['POST', 'PUT', 'PATCH'].includes(config.method)
  ) {
    fetchOptions.body = JSON.stringify(config.body);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(config.url, fetchOptions);

  let body: unknown;
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  const response = {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries(res.headers.entries()),
    body,
  };

  logger.info(`Request completed with status ${response.status}`);

  if (response.status >= 400) {
    logger.error(`Request failed`, { status: response.status, body: response.body });
  }

  return {
    data: response,
    meta: {
      status: response.status,
    },
  };
};
```

### Step 5: Export the node

```typescript
// packages/nodes/src/http/request/index.ts

import { httpRequestDefinition } from './definition';
import { httpRequestRunner } from './runner';
import { NodeDefinition } from '../../types';

export const httpRequest: NodeDefinition = {
  ...httpRequestDefinition,
  runner: httpRequestRunner,
};
```

### Step 6: Register the node

```typescript
// packages/nodes/src/index.ts

import { httpRequest } from './http/request';
import { manualTrigger } from './triggers/manual';
import { cronTrigger } from './triggers/cron';
// ... other imports

export const nodes: NodeDefinition[] = [
  // Triggers
  manualTrigger,
  cronTrigger,

  // HTTP
  httpRequest,

  // Transform
  // ...
];

export const nodeRegistry = new Map<string, NodeDefinition>(
  nodes.map((node) => [node.type, node])
);

export function getNode(type: string): NodeDefinition | undefined {
  return nodeRegistry.get(type);
}
```

## Testing Nodes

```typescript
// packages/nodes/src/http/request/__tests__/runner.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpRequestRunner } from '../runner';

describe('HTTP Request Node', () => {
  const mockContext = {
    executionId: 'exec-123',
    workflowId: 'wf-123',
    nodeId: 'node-123',
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('should make a GET request', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      json: () => Promise.resolve({ data: 'test' }),
    });

    const result = await httpRequestRunner(
      {
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
        },
        data: null,
      },
      mockContext as any
    );

    expect(result.data.status).toBe(200);
    expect(result.data.body).toEqual({ data: 'test' });
  });

  it('should inject API key credentials', async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Map(),
      text: () => Promise.resolve('OK'),
    });

    await httpRequestRunner(
      {
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
        },
        data: null,
        credentials: {
          apiKey: 'secret-key',
          prefix: 'Bearer',
        },
      },
      mockContext as any
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/data',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key',
        }),
      })
    );
  });
});
```

## Node Categories

### Triggers

Trigger nodes start workflow execution:

| Node | Type | Description |
|------|------|-------------|
| Manual | `trigger.manual` | Triggered manually via UI/API |
| Cron | `trigger.cron` | Scheduled execution |
| Webhook | `trigger.webhook` | HTTP webhook endpoint |
| HTTP | `trigger.http` | Poll HTTP endpoint |

### HTTP

| Node | Type | Description |
|------|------|-------------|
| Request | `http.request` | Make HTTP requests |
| Response | `http.response` | Return HTTP response (for webhooks) |

### Transform

| Node | Type | Description |
|------|------|-------------|
| Map | `transform.map` | Transform each item |
| Filter | `transform.filter` | Filter items by condition |
| Merge | `transform.merge` | Merge multiple inputs |
| Split | `transform.split` | Split array into items |
| Set | `transform.set` | Set/modify data |

### Logic

| Node | Type | Description |
|------|------|-------------|
| Condition | `logic.condition` | If/else branching |
| Switch | `logic.switch` | Multiple branches |
| Loop | `logic.loop` | Iterate over items |

## Expression Syntax

Nodes support expressions for dynamic values:

```javascript
// Access previous node output
{{ $node["node-id"].data.response.body }}

// Access trigger data
{{ $trigger.data.body.userId }}

// Access execution context
{{ $execution.id }}
{{ $workflow.id }}

// JavaScript expressions
{{ $node["http-1"].data.items.length }}
{{ $trigger.data.amount * 1.2 }}

// Built-in functions
{{ $now() }}                    // Current timestamp
{{ $uuid() }}                   // Generate UUID
{{ $env("API_KEY") }}          // Environment variable
```

## Best Practices

1. **Validate inputs** - Always use Zod schemas
2. **Log appropriately** - Use context.logger for observability
3. **Handle errors** - Throw descriptive errors
4. **Keep runners pure** - No side effects outside the execution
5. **Document thoroughly** - Clear descriptions and examples
6. **Write tests** - Unit tests for all runners
7. **Type everything** - Full TypeScript coverage
