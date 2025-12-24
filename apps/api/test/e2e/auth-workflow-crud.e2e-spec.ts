/**
 * E2E Tests: Authentication & Workflow CRUD
 *
 * Tests the complete authentication flow and workflow management.
 */

import {
  initializeE2ETestEnvironment,
  teardownE2ETestEnvironment,
  cleanAll,
  createRequest,
  getPrisma,
} from './setup-e2e';
import {
  createTestUser,
  createTestTeam,
  createSimpleWorkflow,
} from './fixtures/e2e.fixtures';

describe('Authentication E2E', () => {
  beforeAll(async () => {
    await initializeE2ETestEnvironment();
  }, 60000);

  afterAll(async () => {
    await teardownE2ETestEnvironment();
  });

  beforeEach(async () => {
    await cleanAll();
  });

  describe('User Registration', () => {
    it('should register a new user', async () => {
      const response = await createRequest()
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        });

      expect(response.status).toBe(201);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject duplicate email registration', async () => {
      const prisma = getPrisma();
      await createTestUser(prisma, { email: 'existing@example.com' });

      const response = await createRequest()
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          name: 'Duplicate User',
        });

      expect(response.status).toBe(409);
    });

    it('should reject weak passwords', async () => {
      const response = await createRequest()
        .post('/api/v1/auth/register')
        .send({
          email: 'user@example.com',
          password: '123',
          name: 'Weak Password User',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('User Login', () => {
    it('should login with valid credentials', async () => {
      const prisma = getPrisma();
      const user = await createTestUser(prisma, {
        email: 'login@example.com',
        password: 'ValidPassword123!',
      });

      const response = await createRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'login@example.com',
          password: 'ValidPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('should reject invalid password', async () => {
      const prisma = getPrisma();
      await createTestUser(prisma, {
        email: 'user@example.com',
        password: 'CorrectPassword123!',
      });

      const response = await createRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await createRequest()
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('JWT Token', () => {
    it('should access protected route with valid token', async () => {
      const prisma = getPrisma();
      const user = await createTestUser(prisma);
      await createTestTeam(prisma, user.id);

      const loginResponse = await createRequest()
        .post('/api/v1/auth/login')
        .send({
          email: user.email,
          password: user.plainPassword,
        });

      const token = loginResponse.body.accessToken;

      const profileResponse = await createRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(user.email);
    });

    it('should reject request without token', async () => {
      const response = await createRequest().get('/api/v1/auth/me');

      expect(response.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await createRequest()
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});

describe('Workflow CRUD E2E', () => {
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

    const prisma = getPrisma();
    const user = await createTestUser(prisma);
    const team = await createTestTeam(prisma, user.id);

    teamId = team.id;
    userId = user.id;

    const loginResponse = await createRequest()
      .post('/api/v1/auth/login')
      .send({
        email: user.email,
        password: user.plainPassword,
      });

    authToken = loginResponse.body.accessToken;
  });

  describe('Create Workflow', () => {
    it('should create a new workflow', async () => {
      const response = await createRequest()
        .post('/api/v1/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Workflow',
          description: 'A test workflow',
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('New Workflow');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.version).toBe(1);
    });

    it('should create workflow with initial graph', async () => {
      const response = await createRequest()
        .post('/api/v1/workflows')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Workflow with Graph',
          graph: {
            nodes: [
              {
                id: 'node-1',
                type: 'custom',
                position: { x: 100, y: 100 },
                data: { nodeType: 'trigger.manual', config: {} },
              },
            ],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body.graph.nodes).toHaveLength(1);
    });
  });

  describe('Read Workflows', () => {
    it('should list all workflows for team', async () => {
      const prisma = getPrisma();

      await createSimpleWorkflow(prisma, teamId, userId, { name: 'Workflow 1' });
      await createSimpleWorkflow(prisma, teamId, userId, { name: 'Workflow 2' });

      const response = await createRequest()
        .get('/api/v1/workflows')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should get a single workflow by ID', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        name: 'Single Workflow',
      });

      const response = await createRequest()
        .get(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(workflow.id);
      expect(response.body.name).toBe('Single Workflow');
    });

    it('should return 404 for non-existent workflow', async () => {
      const response = await createRequest()
        .get('/api/v1/workflows/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Update Workflow', () => {
    it('should update workflow name', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId);

      const response = await createRequest()
        .patch(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Name');
    });

    it('should update workflow graph', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId);

      const newGraph = {
        nodes: [
          {
            id: 'new-node-1',
            type: 'custom',
            position: { x: 200, y: 200 },
            data: { nodeType: 'trigger.webhook', config: {} },
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      };

      const response = await createRequest()
        .patch(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ graph: newGraph });

      expect(response.status).toBe(200);
      expect(response.body.graph.nodes).toHaveLength(1);
      expect(response.body.graph.nodes[0].id).toBe('new-node-1');
    });

    it('should increment version on graph update', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId);

      const response = await createRequest()
        .patch(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          graph: {
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        });

      expect(response.body.version).toBe(2);
    });
  });

  describe('Delete Workflow', () => {
    it('should soft delete a workflow', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId);

      const response = await createRequest()
        .delete(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify soft delete
      const deletedWorkflow = await prisma.workflow.findUnique({
        where: { id: workflow.id },
      });

      expect(deletedWorkflow!.deletedAt).not.toBeNull();
    });

    it('should not list deleted workflows', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId);

      await createRequest()
        .delete(`/api/v1/workflows/${workflow.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await createRequest()
        .get('/api/v1/workflows')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Workflow Activation', () => {
    it('should activate a workflow', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: false,
      });

      const response = await createRequest()
        .post(`/api/v1/workflows/${workflow.id}/activate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(true);
      expect(response.body.status).toBe('ACTIVE');
    });

    it('should deactivate a workflow', async () => {
      const prisma = getPrisma();
      const workflow = await createSimpleWorkflow(prisma, teamId, userId, {
        isActive: true,
      });

      const response = await createRequest()
        .post(`/api/v1/workflows/${workflow.id}/deactivate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);
    });
  });
});
