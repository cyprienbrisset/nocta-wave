/**
 * E2E Test Fixtures
 *
 * Factory functions for creating test data in the real database.
 * These fixtures create actual database records, not mocks.
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Re-export for convenience
export { getPrisma } from '../setup-e2e';

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  prisma: PrismaClient,
  overrides: Partial<{
    id: string;
    email: string;
    password: string;
    name: string;
  }> = {},
) {
  const password = overrides.password || 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      id: overrides.id || `user-${Date.now()}`,
      email: overrides.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: overrides.name || 'Test User',
      emailVerified: true,
    },
  });

  return { ...user, plainPassword: password };
}

/**
 * Create a test team with owner
 */
export async function createTestTeam(
  prisma: PrismaClient,
  ownerId: string,
  overrides: Partial<{
    id: string;
    name: string;
    slug: string;
  }> = {},
) {
  const teamId = overrides.id || `team-${Date.now()}`;
  const slug = overrides.slug || `team-${Date.now()}`;

  const team = await prisma.team.create({
    data: {
      id: teamId,
      name: overrides.name || 'Test Team',
      slug,
      ownerId,
    },
  });

  // Add owner as team member
  await prisma.teamMember.create({
    data: {
      teamId: team.id,
      userId: ownerId,
      role: 'OWNER',
    },
  });

  // Set as user's current team
  await prisma.user.update({
    where: { id: ownerId },
    data: { currentTeamId: team.id },
  });

  return team;
}

/**
 * Create a complete test user with team
 */
export async function createTestUserWithTeam(
  prisma: PrismaClient,
  overrides: Partial<{
    userEmail: string;
    userName: string;
    teamName: string;
  }> = {},
) {
  const user = await createTestUser(prisma, {
    email: overrides.userEmail,
    name: overrides.userName,
  });

  const team = await createTestTeam(prisma, user.id, {
    name: overrides.teamName,
  });

  return { user, team };
}

/**
 * Create a simple workflow (trigger + one action)
 */
export async function createSimpleWorkflow(
  prisma: PrismaClient,
  teamId: string,
  createdById: string,
  overrides: Partial<{
    id: string;
    name: string;
    isActive: boolean;
  }> = {},
) {
  return prisma.workflow.create({
    data: {
      id: overrides.id || `workflow-${Date.now()}`,
      name: overrides.name || 'Simple Test Workflow',
      teamId,
      createdById,
      status: overrides.isActive ? 'ACTIVE' : 'DRAFT',
      isActive: overrides.isActive ?? false,
      version: 1,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Manual Trigger',
              nodeType: 'trigger.manual',
              config: {},
            },
          },
          {
            id: 'set-1',
            type: 'custom',
            position: { x: 300, y: 100 },
            data: {
              label: 'Set Data',
              nodeType: 'transform.set',
              config: {
                values: [
                  { key: 'message', value: 'Hello from E2E test!' },
                  { key: 'timestamp', value: '{{ $now }}' },
                ],
              },
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'set-1',
          },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      settings: {},
    },
  });
}

/**
 * Create a workflow with HTTP request (for testing external calls)
 */
export async function createHttpWorkflow(
  prisma: PrismaClient,
  teamId: string,
  createdById: string,
  httpConfig: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  },
) {
  return prisma.workflow.create({
    data: {
      id: `workflow-http-${Date.now()}`,
      name: 'HTTP Test Workflow',
      teamId,
      createdById,
      status: 'ACTIVE',
      isActive: true,
      version: 1,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Manual Trigger',
              nodeType: 'trigger.manual',
              config: {},
            },
          },
          {
            id: 'http-1',
            type: 'custom',
            position: { x: 300, y: 100 },
            data: {
              label: 'HTTP Request',
              nodeType: 'http.request',
              config: {
                url: httpConfig.url,
                method: httpConfig.method || 'GET',
                headers: httpConfig.headers || {},
                body: httpConfig.body,
              },
            },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'trigger-1',
            target: 'http-1',
          },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      settings: {},
    },
  });
}

/**
 * Create a workflow with conditional logic
 */
export async function createConditionalWorkflow(
  prisma: PrismaClient,
  teamId: string,
  createdById: string,
) {
  return prisma.workflow.create({
    data: {
      id: `workflow-conditional-${Date.now()}`,
      name: 'Conditional Test Workflow',
      teamId,
      createdById,
      status: 'ACTIVE',
      isActive: true,
      version: 1,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'custom',
            position: { x: 100, y: 150 },
            data: {
              label: 'Manual Trigger',
              nodeType: 'trigger.manual',
              config: {},
            },
          },
          {
            id: 'condition-1',
            type: 'custom',
            position: { x: 300, y: 150 },
            data: {
              label: 'Check Value',
              nodeType: 'logic.condition',
              config: {
                conditions: [
                  {
                    field: 'input.value',
                    operator: 'greaterThan',
                    value: 10,
                  },
                ],
                combinator: 'and',
              },
            },
          },
          {
            id: 'true-branch',
            type: 'custom',
            position: { x: 500, y: 50 },
            data: {
              label: 'True Branch',
              nodeType: 'transform.set',
              config: {
                values: [{ key: 'result', value: 'greater than 10' }],
              },
            },
          },
          {
            id: 'false-branch',
            type: 'custom',
            position: { x: 500, y: 250 },
            data: {
              label: 'False Branch',
              nodeType: 'transform.set',
              config: {
                values: [{ key: 'result', value: 'less than or equal to 10' }],
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'condition-1' },
          { id: 'e2', source: 'condition-1', target: 'true-branch', sourceHandle: 'true' },
          { id: 'e3', source: 'condition-1', target: 'false-branch', sourceHandle: 'false' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      settings: {},
    },
  });
}

/**
 * Create a workflow with delay for testing async behavior
 */
export async function createDelayWorkflow(
  prisma: PrismaClient,
  teamId: string,
  createdById: string,
  delayMs: number = 1000,
) {
  return prisma.workflow.create({
    data: {
      id: `workflow-delay-${Date.now()}`,
      name: 'Delay Test Workflow',
      teamId,
      createdById,
      status: 'ACTIVE',
      isActive: true,
      version: 1,
      graph: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'custom',
            position: { x: 100, y: 100 },
            data: {
              label: 'Manual Trigger',
              nodeType: 'trigger.manual',
              config: {},
            },
          },
          {
            id: 'delay-1',
            type: 'custom',
            position: { x: 300, y: 100 },
            data: {
              label: 'Delay',
              nodeType: 'utility.delay',
              config: {
                duration: delayMs,
                unit: 'milliseconds',
              },
            },
          },
          {
            id: 'set-1',
            type: 'custom',
            position: { x: 500, y: 100 },
            data: {
              label: 'Set Result',
              nodeType: 'transform.set',
              config: {
                values: [{ key: 'delayed', value: true }],
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trigger-1', target: 'delay-1' },
          { id: 'e2', source: 'delay-1', target: 'set-1' },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
      settings: {},
    },
  });
}

/**
 * Create test credentials
 */
export async function createTestCredential(
  prisma: PrismaClient,
  teamId: string,
  createdById: string,
  overrides: Partial<{
    id: string;
    name: string;
    type: string;
    encryptedData: string;
  }> = {},
) {
  return prisma.credential.create({
    data: {
      id: overrides.id || `cred-${Date.now()}`,
      name: overrides.name || 'Test API Key',
      type: overrides.type || 'api_key',
      teamId,
      createdById,
      encryptedData: overrides.encryptedData || 'encrypted:test-key-value',
    },
  });
}

/**
 * Create a webhook for a workflow
 */
export async function createTestWebhook(
  prisma: PrismaClient,
  workflowId: string,
  teamId: string,
  overrides: Partial<{
    id: string;
    path: string;
    method: string;
  }> = {},
) {
  return prisma.webhook.create({
    data: {
      id: overrides.id || `webhook-${Date.now()}`,
      workflowId,
      teamId,
      path: overrides.path || `test-webhook-${Date.now()}`,
      method: overrides.method || 'POST',
      isActive: true,
    },
  });
}

/**
 * Seed complete test scenario: user, team, workflow, credentials
 */
export async function seedCompleteTestScenario(prisma: PrismaClient) {
  const { user, team } = await createTestUserWithTeam(prisma, {
    userEmail: 'e2e-test@example.com',
    userName: 'E2E Test User',
    teamName: 'E2E Test Team',
  });

  const simpleWorkflow = await createSimpleWorkflow(prisma, team.id, user.id, {
    isActive: true,
  });

  const conditionalWorkflow = await createConditionalWorkflow(prisma, team.id, user.id);

  const credential = await createTestCredential(prisma, team.id, user.id);

  return {
    user,
    team,
    simpleWorkflow,
    conditionalWorkflow,
    credential,
  };
}
