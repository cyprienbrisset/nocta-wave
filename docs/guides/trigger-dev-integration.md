# Trigger.dev Integration Guide

## Overview

WS-Flows uses [Trigger.dev](https://trigger.dev) as its execution engine. This provides:

- Reliable job execution with retries
- Built-in observability
- Step-by-step execution tracking
- Local-first development

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   WS-Flows API   │────▶│   Trigger.dev    │
│   (NestJS)       │     │   Server         │
└──────────────────┘     └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   WS-Flows       │
                         │   Worker         │
                         │   (Trigger.dev)  │
                         └──────────────────┘
```

## Mapping Concepts

| WS-Flows | Trigger.dev |
|----------|-------------|
| Workflow | Job |
| Node | Step |
| Execution | Run |
| Trigger | Trigger |

## Local Development Setup

### 1. Install Trigger.dev CLI

```bash
npm install -g @trigger.dev/cli
```

### 2. Configure trigger.config.ts

```typescript
// apps/worker/trigger.config.ts

import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "ws-flows",
  runtime: "node",
  logLevel: "debug",
  maxDuration: 300, // 5 minutes max per execution
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      factor: 2,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
    },
  },
});
```

### 3. Start local Trigger.dev

```bash
# Development mode (auto-reload)
npx trigger.dev@latest dev
```

## Workflow to Job Conversion

### Dynamic Job Generation

When a workflow is saved, we generate a Trigger.dev job:

```typescript
// apps/api/src/modules/workflow/services/job-generator.service.ts

import { Injectable } from '@nestjs/common';
import { Workflow, WorkflowGraph } from '@prisma/client';

@Injectable()
export class JobGeneratorService {
  generateJobCode(workflow: Workflow): string {
    const graph = workflow.graph as WorkflowGraph;
    const sortedNodes = this.topologicalSort(graph);

    return `
import { task, logger } from "@trigger.dev/sdk/v3";
import { nodeRegistry } from "@ws-flows/nodes";

export const workflow_${workflow.id.replace(/-/g, '_')} = task({
  id: "workflow-${workflow.id}",
  run: async (payload: { input: unknown; executionId: string }) => {
    const { input, executionId } = payload;
    let currentData = input;

    ${sortedNodes.map(node => this.generateNodeStep(node)).join('\n\n')}

    return currentData;
  },
});
`;
  }

  private generateNodeStep(node: WorkflowNode): string {
    return `
    // Node: ${node.data.label}
    currentData = await logger.wrap("${node.id}", async () => {
      const nodeRunner = nodeRegistry.get("${node.type}");
      if (!nodeRunner) throw new Error("Unknown node type: ${node.type}");

      const result = await nodeRunner.runner({
        config: ${JSON.stringify(node.data.config)},
        data: currentData,
      }, {
        executionId,
        workflowId: "${node.id}",
        nodeId: "${node.id}",
        logger,
      });

      return result.data;
    });
    `;
  }

  private topologicalSort(graph: WorkflowGraph): WorkflowNode[] {
    // Implementation of topological sort
    // Returns nodes in execution order
  }
}
```

## Triggering Executions

### Manual Trigger

```typescript
// apps/api/src/modules/execution/services/execution.service.ts

import { Injectable } from '@nestjs/common';
import { tasks } from "@trigger.dev/sdk/v3";

@Injectable()
export class ExecutionService {
  async triggerManual(workflowId: string, input: unknown) {
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        status: 'PENDING',
        triggerType: 'manual',
        input: input as any,
      },
    });

    // Trigger the job
    const handle = await tasks.trigger(`workflow-${workflowId}`, {
      input,
      executionId: execution.id,
    });

    return { executionId: execution.id, runId: handle.id };
  }
}
```

### Cron Trigger

```typescript
// apps/worker/src/triggers/cron.ts

import { schedules } from "@trigger.dev/sdk/v3";

// Dynamic cron registration
export function registerCronTrigger(workflowId: string, cronExpression: string) {
  return schedules.task({
    id: `cron-${workflowId}`,
    cron: cronExpression,
    run: async () => {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger(`workflow-${workflowId}`, {
        input: { triggeredAt: new Date().toISOString() },
        executionId: crypto.randomUUID(),
      });
    },
  });
}
```

### Webhook Trigger

```typescript
// apps/api/src/modules/webhook/webhook.controller.ts

import { Controller, Post, Param, Body, Headers } from '@nestjs/common';
import { tasks } from "@trigger.dev/sdk/v3";

@Controller('webhooks')
export class WebhookController {
  @Post(':workflowId')
  async handleWebhook(
    @Param('workflowId') workflowId: string,
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    const execution = await this.executionService.create({
      workflowId,
      triggerType: 'webhook',
      input: { body, headers },
    });

    await tasks.trigger(`workflow-${workflowId}`, {
      input: { body, headers },
      executionId: execution.id,
    });

    return { executionId: execution.id };
  }
}
```

## Step Execution

### Using Trigger.dev Steps

```typescript
// packages/nodes/src/http/request/runner.ts

import { logger } from "@trigger.dev/sdk/v3";

export const httpRequestRunner: NodeRunner = async (input, context) => {
  // Wrap in logger for observability
  const response = await logger.wrap("http-request", async () => {
    const config = HttpRequestConfigSchema.parse(input.config);

    logger.info("Making HTTP request", {
      url: config.url,
      method: config.method,
    });

    const res = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: config.body ? JSON.stringify(config.body) : undefined,
    });

    const data = await res.json();

    logger.info("Request completed", {
      status: res.status,
    });

    return { status: res.status, data };
  });

  return { data: response };
};
```

### Conditional Execution

```typescript
// packages/nodes/src/logic/condition/runner.ts

import { logger } from "@trigger.dev/sdk/v3";

export const conditionRunner: NodeRunner = async (input, context) => {
  const { condition, trueValue, falseValue } = input.config;

  const result = await logger.wrap("evaluate-condition", async () => {
    const conditionResult = evaluateExpression(condition, input.data);

    logger.info("Condition evaluated", {
      condition,
      result: conditionResult,
    });

    return conditionResult;
  });

  return {
    data: result ? trueValue : falseValue,
    meta: { conditionResult: result },
  };
};
```

## Error Handling & Retries

### Retry Configuration

```typescript
// apps/worker/src/jobs/workflow.ts

import { task, retry } from "@trigger.dev/sdk/v3";

export const workflowTask = task({
  id: "workflow-execution",
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload) => {
    // Execution logic
  },
});
```

### Per-Node Retry

```typescript
// Retry specific node
const result = await logger.wrap(
  "http-request",
  {
    retry: {
      maxAttempts: 5,
      factor: 1.5,
      minTimeoutInMs: 500,
    },
  },
  async () => {
    return fetch(url);
  }
);
```

### Error Handling

```typescript
import { logger, AbortTaskRunError } from "@trigger.dev/sdk/v3";

export const nodeRunner: NodeRunner = async (input, context) => {
  try {
    const result = await performAction(input);
    return { data: result };
  } catch (error) {
    logger.error("Node execution failed", { error: error.message });

    // Abort entire workflow
    if (error instanceof CriticalError) {
      throw new AbortTaskRunError("Critical error, aborting workflow");
    }

    // Let Trigger.dev retry
    throw error;
  }
};
```

## Observability

### Logging

```typescript
import { logger } from "@trigger.dev/sdk/v3";

// Different log levels
logger.debug("Debug info", { data });
logger.info("Info message", { data });
logger.warn("Warning", { data });
logger.error("Error occurred", { error });

// Structured logging
logger.info("Processing item", {
  itemId: item.id,
  status: item.status,
  duration: Date.now() - startTime,
});
```

### Metadata

```typescript
import { metadata } from "@trigger.dev/sdk/v3";

export const workflowTask = task({
  id: "workflow",
  run: async (payload) => {
    // Add metadata for dashboard
    metadata.set("workflowId", payload.workflowId);
    metadata.set("nodeCount", payload.nodes.length);

    // Execution...
  },
});
```

### Real-time Updates

```typescript
// apps/api/src/modules/execution/execution.gateway.ts

import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { runs } from "@trigger.dev/sdk/v3";

@WebSocketGateway()
export class ExecutionGateway {
  @WebSocketServer()
  server: Server;

  async subscribeToRun(runId: string, executionId: string) {
    const subscription = runs.subscribeToRun(runId);

    for await (const event of subscription) {
      this.server.to(executionId).emit('execution:update', {
        executionId,
        status: event.status,
        output: event.output,
      });

      if (event.status === 'COMPLETED' || event.status === 'FAILED') {
        break;
      }
    }
  }
}
```

## Production Deployment

### Self-hosted Trigger.dev

```yaml
# docker-compose.prod.yml

services:
  trigger:
    image: triggerdev/trigger:latest
    environment:
      DATABASE_URL: ${TRIGGER_DATABASE_URL}
      REDIS_URL: ${TRIGGER_REDIS_URL}
      ENCRYPTION_KEY: ${TRIGGER_ENCRYPTION_KEY}
      AUTH_SECRET: ${TRIGGER_AUTH_SECRET}
    deploy:
      replicas: 2
```

### Worker Scaling

```yaml
services:
  worker:
    image: ws-flows-worker:latest
    deploy:
      replicas: 5
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Environment Variables

```env
# Production
TRIGGER_API_URL=https://trigger.your-domain.com
TRIGGER_API_KEY=tr_prod_xxxxx
TRIGGER_SECRET_KEY=your-secret-key
```

## Best Practices

1. **Use steps for observability** - Wrap all significant operations
2. **Configure retries appropriately** - Different strategies for different operations
3. **Handle timeouts** - Set reasonable timeouts per node type
4. **Log structured data** - Use objects, not string interpolation
5. **Clean up resources** - Handle cancellation gracefully
6. **Monitor queue depth** - Scale workers based on backlog
