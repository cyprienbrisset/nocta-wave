import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { executeWorkflow } from '../execution/executor';
import type { WorkflowGraph } from '@ws-flows/shared';

const WorkflowExecutionPayload = z.object({
  executionId: z.string(),
  workflowId: z.string(),
  teamId: z.string(),
  graph: z.any() as z.ZodType<WorkflowGraph>,
  inputData: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

export const executeWorkflowTask = task({
  id: 'execute-workflow',
  maxDuration: 600, // 10 minutes max
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: z.infer<typeof WorkflowExecutionPayload>) => {
    const validatedPayload = WorkflowExecutionPayload.parse(payload);

    logger.info('Starting workflow execution', {
      executionId: validatedPayload.executionId,
      workflowId: validatedPayload.workflowId,
    });

    const result = await executeWorkflow({
      executionId: validatedPayload.executionId,
      workflowId: validatedPayload.workflowId,
      teamId: validatedPayload.teamId,
      graph: validatedPayload.graph,
      inputData: validatedPayload.inputData || {},
      settings: validatedPayload.settings,
    });

    if (result.success) {
      logger.info('Workflow execution completed', {
        executionId: validatedPayload.executionId,
        duration: result.duration,
      });
    } else {
      logger.error('Workflow execution failed', {
        executionId: validatedPayload.executionId,
        error: result.error,
        duration: result.duration,
      });
    }

    return result;
  },
});
