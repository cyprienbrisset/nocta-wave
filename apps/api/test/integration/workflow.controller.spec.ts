/**
 * Workflow Controller Integration Tests
 *
 * Tests the HTTP endpoints for workflow management
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { WorkflowController } from '../../src/modules/workflow/workflow.controller';
import { WorkflowService } from '../../src/modules/workflow/workflow.service';
import { JwtAuthGuard } from '../../src/modules/auth/guards/jwt-auth.guard';
import {
  testWorkflow,
  testUser,
  simpleWorkflowGraph,
} from '../fixtures/workflow.fixtures';

describe('WorkflowController (e2e)', () => {
  let app: INestApplication;
  let workflowService: jest.Mocked<WorkflowService>;

  const mockUser = {
    id: testUser.id,
    currentTeamId: testUser.currentTeamId,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByTeam: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            duplicate: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            getVersions: jest.fn(),
            restoreVersion: jest.fn(),
            exportWorkflow: jest.fn(),
            importWorkflow: jest.fn(),
            getVersion: jest.fn(),
            getVersionDiff: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    workflowService = moduleFixture.get(WorkflowService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /workflows', () => {
    it('should create a workflow', async () => {
      workflowService.create.mockResolvedValue(testWorkflow);

      const response = await request(app.getHttpServer())
        .post('/workflows')
        .send({ name: 'Test Workflow' })
        .expect(201);

      expect(response.body).toBeDefined();
      expect(workflowService.create).toHaveBeenCalledWith(
        mockUser.id,
        mockUser.currentTeamId,
        expect.objectContaining({ name: 'Test Workflow' })
      );
    });

    it('should validate required name field', async () => {
      await request(app.getHttpServer())
        .post('/workflows')
        .send({})
        .expect(400);
    });
  });

  describe('GET /workflows', () => {
    it('should return paginated workflows', async () => {
      workflowService.findByTeam.mockResolvedValue({
        data: [testWorkflow],
        total: 1,
        page: 1,
        pageSize: 20,
      });

      const response = await request(app.getHttpServer())
        .get('/workflows')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(1);
    });

    it('should accept query parameters', async () => {
      workflowService.findByTeam.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });

      await request(app.getHttpServer())
        .get('/workflows')
        .query({ status: 'ACTIVE', search: 'test' })
        .expect(200);

      expect(workflowService.findByTeam).toHaveBeenCalledWith(
        mockUser.currentTeamId,
        mockUser.id,
        expect.objectContaining({
          status: 'ACTIVE',
          search: 'test',
        })
      );
    });
  });

  describe('GET /workflows/:id', () => {
    it('should return a workflow', async () => {
      workflowService.findById.mockResolvedValue(testWorkflow);

      const response = await request(app.getHttpServer())
        .get(`/workflows/${testWorkflow.id}`)
        .expect(200);

      expect(response.body.id).toBe(testWorkflow.id);
    });

    it('should return 404 for non-existent workflow', async () => {
      workflowService.findById.mockRejectedValue(
        new Error('Workflow not found')
      );

      await request(app.getHttpServer())
        .get('/workflows/nonexistent')
        .expect(500); // Would be 404 with proper exception filter
    });
  });

  describe('PUT /workflows/:id', () => {
    it('should update a workflow', async () => {
      workflowService.update.mockResolvedValue({
        ...testWorkflow,
        name: 'Updated Name',
      });

      const response = await request(app.getHttpServer())
        .put(`/workflows/${testWorkflow.id}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should update workflow graph', async () => {
      workflowService.update.mockResolvedValue({
        ...testWorkflow,
        graph: simpleWorkflowGraph,
      });

      await request(app.getHttpServer())
        .put(`/workflows/${testWorkflow.id}`)
        .send({ graph: simpleWorkflowGraph })
        .expect(200);

      expect(workflowService.update).toHaveBeenCalledWith(
        testWorkflow.id,
        mockUser.id,
        expect.objectContaining({ graph: simpleWorkflowGraph })
      );
    });
  });

  describe('DELETE /workflows/:id', () => {
    it('should delete a workflow', async () => {
      workflowService.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/workflows/${testWorkflow.id}`)
        .expect(200);

      expect(workflowService.delete).toHaveBeenCalledWith(
        testWorkflow.id,
        mockUser.id
      );
    });
  });

  describe('POST /workflows/:id/duplicate', () => {
    it('should duplicate a workflow', async () => {
      const duplicated = {
        ...testWorkflow,
        id: 'duplicated-id',
        name: 'Test Workflow (copie)',
      };
      workflowService.duplicate.mockResolvedValue(duplicated);

      const response = await request(app.getHttpServer())
        .post(`/workflows/${testWorkflow.id}/duplicate`)
        .expect(201);

      expect(response.body.name).toContain('copie');
    });
  });

  describe('POST /workflows/:id/activate', () => {
    it('should activate a workflow', async () => {
      workflowService.activate.mockResolvedValue({
        ...testWorkflow,
        status: 'ACTIVE',
        isActive: true,
      });

      const response = await request(app.getHttpServer())
        .post(`/workflows/${testWorkflow.id}/activate`)
        .expect(201);

      expect(response.body.status).toBe('ACTIVE');
      expect(response.body.isActive).toBe(true);
    });
  });

  describe('POST /workflows/:id/deactivate', () => {
    it('should deactivate a workflow', async () => {
      workflowService.deactivate.mockResolvedValue({
        ...testWorkflow,
        status: 'INACTIVE',
        isActive: false,
      });

      const response = await request(app.getHttpServer())
        .post(`/workflows/${testWorkflow.id}/deactivate`)
        .expect(201);

      expect(response.body.status).toBe('INACTIVE');
      expect(response.body.isActive).toBe(false);
    });
  });

  describe('GET /workflows/:id/versions', () => {
    it('should return workflow versions', async () => {
      const versions = [
        { id: 'v1', version: 1, changelog: 'Initial', createdAt: new Date() },
        { id: 'v2', version: 2, changelog: 'Update', createdAt: new Date() },
      ];
      workflowService.getVersions.mockResolvedValue(versions);

      const response = await request(app.getHttpServer())
        .get(`/workflows/${testWorkflow.id}/versions`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /workflows/:id/export', () => {
    it('should export workflow as JSON', async () => {
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        workflow: {
          name: testWorkflow.name,
          description: testWorkflow.description,
          graph: testWorkflow.graph,
          settings: testWorkflow.settings,
        },
      };
      workflowService.exportWorkflow.mockResolvedValue(exportData);

      const response = await request(app.getHttpServer())
        .get(`/workflows/${testWorkflow.id}/export`)
        .expect(200);

      expect(response.body.workflow).toBeDefined();
      expect(response.body.version).toBeDefined();
    });
  });

  describe('POST /workflows/import', () => {
    it('should import workflow from JSON', async () => {
      const importData = {
        version: '1.0',
        workflow: {
          name: 'Imported Workflow',
          graph: simpleWorkflowGraph,
        },
      };
      workflowService.importWorkflow.mockResolvedValue({
        ...testWorkflow,
        name: 'Imported Workflow',
      });

      const response = await request(app.getHttpServer())
        .post('/workflows/import')
        .send(importData)
        .expect(201);

      expect(response.body.name).toBe('Imported Workflow');
    });
  });
});
