import { z } from 'zod';

// Node position schema
export const NodePositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Node data schema
export const NodeDataSchema = z.object({
  label: z.string().min(1),
  icon: z.string().optional(),
  config: z.record(z.unknown()),
  credentials: z.array(z.string()).optional(),
});

// Workflow node schema
export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: NodePositionSchema,
  data: NodeDataSchema,
});

// Workflow edge schema
export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourceHandle: z.string().optional(),
  target: z.string().min(1),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  type: z.enum(['default', 'conditional']).optional(),
  condition: z.string().optional(),
});

// Retry policy schema
export const RetryPolicySchema = z.object({
  maxRetries: z.number().min(0).max(10).default(3),
  retryDelay: z.number().min(100).max(60000).default(1000),
  backoffMultiplier: z.number().min(1).max(5).default(2),
});

// Workflow settings schema
export const WorkflowSettingsSchema = z.object({
  timezone: z.string().optional(),
  retryPolicy: RetryPolicySchema.optional(),
  timeout: z.number().min(1000).max(3600000).optional(),
  errorHandling: z.enum(['stop', 'continue']).optional(),
});

// Workflow graph schema
export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema),
  edges: z.array(WorkflowEdgeSchema),
  settings: WorkflowSettingsSchema.optional(),
});

// Create workflow schema
export const CreateWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  graph: WorkflowGraphSchema,
});

export type CreateWorkflowInput = z.infer<typeof CreateWorkflowSchema>;

// Update workflow schema
export const UpdateWorkflowSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  graph: WorkflowGraphSchema.optional(),
});

export type UpdateWorkflowInput = z.infer<typeof UpdateWorkflowSchema>;

// Workflow query schema
export const WorkflowQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sort: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type WorkflowQueryInput = z.infer<typeof WorkflowQuerySchema>;

// Trigger execution schema
export const TriggerExecutionSchema = z.object({
  input: z.record(z.unknown()).optional(),
});

export type TriggerExecutionInput = z.infer<typeof TriggerExecutionSchema>;
