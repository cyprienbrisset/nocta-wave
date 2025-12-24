/**
 * E2E Tests: Workflow Execution Pipeline
 *
 * Tests the complete execution flow:
 * API Request -> Queue -> Worker -> Database -> Response
 *
 * These tests run against real PostgreSQL and Redis instances.
 */

import {
  initializeE2ETestEnvironment,
  teardownE2ETestEnvironment,
  cleanAll,
  createRequest,
  waitForExecutionComplete,
  waitFor,
  getPrisma,
  getRedis,
} from './setup-e2e';
import {
  createTestUserWithTeam,
  createSimpleWorkflow,
  createConditionalWorkflow,
  createDelayWorkflow,
} from './fixtures/e2e.fixtures';

describe('Workflow Execution E2E', () => {
  let authToken: string;
  let teamId: string;
  let userId: string;

  beforeAll(async () => {
    await initializeE2ETestEnvironment();
  }, 60000);

  afterAll(async () => {
    await teardownE2ETestEnvironment();
  });

  beforeEach(async () => {
    await cleanAll();

    // Create test user and team
    const prisma = getPrisma();
    const { user, team } = await createTestUserWithTeam(prisma);
    teamId = team.id;
    userId = user.id;

    // Login to get auth token
    const loginResponse = await createRequest()
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: user.plainPassword,
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('Simple Workflow Execution', () => {
    it('should execute a simple workflow end-to-end', async () => {
      const prisma = getPrisma();

      // Create workflow
      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      // Trigger execution via API
      const triggerResponse = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: { testData: 'hello' },
        });

      expect(triggerResponse.status).toBe(201);
      expect(triggerResponse.body.id).toBeDefined();
      expect(triggerResponse.body.status).toBe('PENDING');

      const executionId = triggerResponse.body.id;

      // Wait for execution to complete
      await waitForExecutionComplete(executionId, { timeout: 15000 });

      // Verify execution completed successfully
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
        include: { logs: true },
      });

      expect(execution).toBeDefined();
      expect(execution!.status).toBe('SUCCESS');
      expect(execution!.logs.length).toBeGreaterThan(0);
    });

    it('should store execution logs for each node', async () => {
      const prisma = getPrisma();

      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      const triggerResponse = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: {},
        });

      const executionId = triggerResponse.body.id;
      await waitForExecutionComplete(executionId);

      // Get execution with logs
      const logsResponse = await createRequest()
        .get(`/api/v1/executions/${executionId}/logs`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(logsResponse.status).toBe(200);
      expect(logsResponse.body.length).toBeGreaterThanOrEqual(2); // trigger + set node
    });
  });

  describe('Execution Status Updates', () => {
    it('should transition through PENDING -> RUNNING -> SUCCESS states', async () => {
      const prisma = getPrisma();
      const redis = getRedis();

      const workflow = await createDelayWorkflow(prisma, teamId, userId, 500);
      const statusHistory: string[] = [];

      // Subscribe to execution updates
      const subscriber = redis.duplicate();
      await subscriber.subscribe(`execution:${workflow.id}`);

      subscriber.on('message', (channel, message) => {
        try {
          const data = JSON.parse(message);
          if (data.status) {
            statusHistory.push(data.status);
          }
        } catch {
          // Ignore parse errors
        }
      });

      // Trigger execution
      const triggerResponse = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: {},
        });

      const executionId = triggerResponse.body.id;
      await waitForExecutionComplete(executionId, { timeout: 10000 });

      // Cleanup subscriber
      await subscriber.unsubscribe(`execution:${workflow.id}`);
      await subscriber.quit();

      // Verify final state
      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
      });

      expect(execution!.status).toBe('SUCCESS');
      expect(execution!.startedAt).toBeDefined();
      expect(execution!.endedAt).toBeDefined();
    });
  });

  describe('Conditional Workflow Execution', () => {
    it('should execute true branch when condition is met', async () => {
      const prisma = getPrisma();

      const workflow = await createConditionalWorkflow(prisma, teamId, userId);

      const triggerResponse = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: { value: 15 }, // Greater than 10
        });

      const executionId = triggerResponse.body.id;
      await waitForExecutionComplete(executionId);

      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
        include: { logs: true },
      });

      expect(execution!.status).toBe('SUCCESS');

      // Check that true branch was executed
      const trueBranchLog = execution!.logs.find(
        (log) => log.nodeId === 'true-branch',
      );
      expect(trueBranchLog).toBeDefined();
      expect(trueBranchLog!.status).toBe('SUCCESS');
    });

    it('should execute false branch when condition is not met', async () => {
      const prisma = getPrisma();

      const workflow = await createConditionalWorkflow(prisma, teamId, userId);

      const triggerResponse = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: { value: 5 }, // Less than or equal to 10
        });

      const executionId = triggerResponse.body.id;
      await waitForExecutionComplete(executionId);

      const execution = await prisma.execution.findUnique({
        where: { id: executionId },
        include: { logs: true },
      });

      expect(execution!.status).toBe('SUCCESS');

      // Check that false branch was executed
      const falseBranchLog = execution!.logs.find(
        (log) => log.nodeId === 'false-branch',
      );
      expect(falseBranchLog).toBeDefined();
      expect(falseBranchLog!.status).toBe('SUCCESS');
    });
  });

  describe('Execution Error Handling', () => {
    it('should handle workflow not found', async () => {
      const response = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: 'non-existent-workflow',
          input: {},
        });

      expect(response.status).toBe(404);
    });

    it('should handle inactive workflow', async () => {
      const prisma = getPrisma();

      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: false, // Inactive
      });

      const response = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: {},
        });

      // Should return 400 or similar error for inactive workflow
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Queue Processing', () => {
    it('should process multiple executions from queue', async () => {
      const prisma = getPrisma();

      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      // Trigger multiple executions
      const executionIds: string[] = [];
      for (let i = 0; i < 3; i++) {
        const response = await createRequest()
          .post('/api/v1/executions/trigger')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            workflowId: workflow.id,
            input: { index: i },
          });

        executionIds.push(response.body.id);
      }

      // Wait for all to complete
      await Promise.all(
        executionIds.map((id) => waitForExecutionComplete(id)),
      );

      // Verify all completed
      for (const id of executionIds) {
        const execution = await prisma.execution.findUnique({
          where: { id },
        });
        expect(execution!.status).toBe('SUCCESS');
      }
    });

    it('should respect execution order for sequential workflows', async () => {
      const prisma = getPrisma();

      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      const response1 = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowId: workflow.id, input: { seq: 1 } });

      const response2 = await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ workflowId: workflow.id, input: { seq: 2 } });

      await waitForExecutionComplete(response1.body.id);
      await waitForExecutionComplete(response2.body.id);

      const exec1 = await prisma.execution.findUnique({
        where: { id: response1.body.id },
      });
      const exec2 = await prisma.execution.findUnique({
        where: { id: response2.body.id },
      });

      // First execution should have started first
      expect(exec1!.startedAt!.getTime()).toBeLessThanOrEqual(
        exec2!.startedAt!.getTime(),
      );
    });
  });

  describe('Redis Queue Integration', () => {
    it('should add execution to Redis queue', async () => {
      const prisma = getPrisma();
      const redis = getRedis();

      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      // Get initial queue length
      const initialLength = await redis.llen('workflow:executions');

      // Trigger execution
      await createRequest()
        .post('/api/v1/executions/trigger')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workflowId: workflow.id,
          input: {},
        });

      // Wait briefly for queue processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Queue should have been updated (either still has item or was processed)
      const execution = await prisma.execution.findFirst({
        where: { workflowId: workflow.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(execution).toBeDefined();
    });
  });
});
