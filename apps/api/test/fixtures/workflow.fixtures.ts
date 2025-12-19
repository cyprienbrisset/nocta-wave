/**
 * Workflow Test Fixtures
 *
 * Pre-defined workflow data for testing
 */

export const testUser = {
  id: 'user-test-001',
  email: 'test@example.com',
  name: 'Test User',
  password: 'hashed_password',
  currentTeamId: 'team-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const testTeam = {
  id: 'team-test-001',
  name: 'Test Team',
  slug: 'test-team',
  ownerId: 'user-test-001',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const emptyWorkflowGraph = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const simpleWorkflowGraph = {
  nodes: [
    {
      id: 'node-1',
      type: 'custom',
      position: { x: 100, y: 100 },
      data: {
        label: 'Manual Trigger',
        nodeType: 'trigger.manual',
        config: {},
      },
    },
    {
      id: 'node-2',
      type: 'custom',
      position: { x: 300, y: 100 },
      data: {
        label: 'HTTP Request',
        nodeType: 'http.request',
        config: {
          url: 'https://api.example.com/data',
          method: 'GET',
        },
      },
    },
  ],
  edges: [
    {
      id: 'edge-1-2',
      source: 'node-1',
      target: 'node-2',
    },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const conditionalWorkflowGraph = {
  nodes: [
    {
      id: 'trigger',
      type: 'custom',
      position: { x: 100, y: 150 },
      data: {
        label: 'Webhook',
        nodeType: 'trigger.webhook',
        config: {},
      },
    },
    {
      id: 'condition',
      type: 'custom',
      position: { x: 300, y: 150 },
      data: {
        label: 'IF',
        nodeType: 'logic.condition',
        config: {
          condition: 'data.status === "active"',
        },
      },
    },
    {
      id: 'success-action',
      type: 'custom',
      position: { x: 500, y: 50 },
      data: {
        label: 'Success Handler',
        nodeType: 'http.request',
        config: { url: 'https://api.example.com/success', method: 'POST' },
      },
    },
    {
      id: 'failure-action',
      type: 'custom',
      position: { x: 500, y: 250 },
      data: {
        label: 'Failure Handler',
        nodeType: 'http.request',
        config: { url: 'https://api.example.com/failure', method: 'POST' },
      },
    },
  ],
  edges: [
    { id: 'e1', source: 'trigger', target: 'condition' },
    { id: 'e2', source: 'condition', target: 'success-action', sourceHandle: 'true' },
    { id: 'e3', source: 'condition', target: 'failure-action', sourceHandle: 'false' },
  ],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const createTestWorkflow = (overrides?: Partial<typeof testWorkflow>) => ({
  ...testWorkflow,
  ...overrides,
});

export const testWorkflow = {
  id: 'workflow-test-001',
  name: 'Test Workflow',
  description: 'A workflow for testing',
  teamId: 'team-test-001',
  createdById: 'user-test-001',
  status: 'DRAFT' as const,
  isActive: false,
  version: 1,
  graph: simpleWorkflowGraph,
  settings: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

export const activeWorkflow = {
  ...testWorkflow,
  id: 'workflow-active-001',
  name: 'Active Workflow',
  status: 'ACTIVE' as const,
  isActive: true,
};

export const testExecution = {
  id: 'exec-test-001',
  workflowId: 'workflow-test-001',
  status: 'SUCCESS' as const,
  triggerType: 'manual',
  input: { data: 'test' },
  output: { result: 'success' },
  error: null,
  startedAt: new Date('2024-01-01T10:00:00Z'),
  endedAt: new Date('2024-01-01T10:00:05Z'),
  duration: 5000,
  nodeExecutions: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};
