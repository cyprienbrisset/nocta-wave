/**
 * Workflow Service Integration Tests
 *
 * These tests verify the workflow service behavior with a mocked database.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from '../../src/modules/workflow/workflow.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TeamService } from '../../src/modules/team/team.service';
import { BranchService } from '../../src/modules/branch/branch.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  testWorkflow,
  testUser,
  testTeam,
  simpleWorkflowGraph,
  emptyWorkflowGraph,
  createTestWorkflow,
} from '../fixtures/workflow.fixtures';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let prismaService: jest.Mocked<PrismaService>;
  let teamService: jest.Mocked<TeamService>;
  let branchService: jest.Mocked<BranchService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: PrismaService,
          useValue: {
            workflow: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            workflowVersion: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn(prismaService)),
          },
        },
        {
          provide: TeamService,
          useValue: {
            checkTeamAccess: jest.fn(),
          },
        },
        {
          provide: BranchService,
          useValue: {
            createMainBranch: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    prismaService = module.get(PrismaService);
    teamService = module.get(TeamService);
    branchService = module.get(BranchService);
  });

  describe('create', () => {
    it('should create a workflow with default graph', async () => {
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.create.mockResolvedValue(testWorkflow);
      branchService.createMainBranch.mockResolvedValue({} as any);

      const result = await service.create(testUser.id, testTeam.id, {
        name: 'Test Workflow',
      });

      expect(result).toEqual(testWorkflow);
      expect(teamService.checkTeamAccess).toHaveBeenCalledWith(
        testTeam.id,
        testUser.id,
        ['OWNER', 'ADMIN', 'MEMBER']
      );
      expect(prismaService.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Workflow',
          teamId: testTeam.id,
          createdById: testUser.id,
        }),
      });
      expect(branchService.createMainBranch).toHaveBeenCalled();
    });

    it('should create workflow with custom graph', async () => {
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.create.mockResolvedValue({
        ...testWorkflow,
        graph: simpleWorkflowGraph,
      });
      branchService.createMainBranch.mockResolvedValue({} as any);

      const result = await service.create(testUser.id, testTeam.id, {
        name: 'Custom Workflow',
        graph: simpleWorkflowGraph,
      });

      expect(prismaService.workflow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          graph: simpleWorkflowGraph,
        }),
      });
    });

    it('should continue if branch creation fails', async () => {
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.create.mockResolvedValue(testWorkflow);
      branchService.createMainBranch.mockRejectedValue(new Error('Branch error'));

      // Should not throw
      const result = await service.create(testUser.id, testTeam.id, {
        name: 'Test Workflow',
      });

      expect(result).toEqual(testWorkflow);
    });
  });

  describe('findById', () => {
    it('should return workflow if found', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);

      const result = await service.findById(testWorkflow.id, testUser.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(testWorkflow.id);
    });

    it('should throw NotFoundException if workflow not found', async () => {
      prismaService.workflow.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should verify team access when userId provided', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);

      await service.findById(testWorkflow.id, testUser.id);

      expect(teamService.checkTeamAccess).toHaveBeenCalledWith(
        testWorkflow.teamId,
        testUser.id,
        ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']
      );
    });
  });

  describe('findByTeam', () => {
    it('should return paginated workflows', async () => {
      const workflows = [
        testWorkflow,
        createTestWorkflow({ id: 'workflow-2', name: 'Workflow 2' }),
      ];
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.findMany.mockResolvedValue(workflows as any);
      prismaService.workflow.count.mockResolvedValue(2);

      const result = await service.findByTeam(testTeam.id, testUser.id, {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.findMany.mockResolvedValue([]);
      prismaService.workflow.count.mockResolvedValue(0);

      await service.findByTeam(testTeam.id, testUser.id, {
        status: 'ACTIVE' as any,
      });

      expect(prismaService.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should search by name', async () => {
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.findMany.mockResolvedValue([]);
      prismaService.workflow.count.mockResolvedValue(0);

      await service.findByTeam(testTeam.id, testUser.id, {
        search: 'test',
      });

      expect(prismaService.workflow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('update', () => {
    it('should update workflow', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.update.mockResolvedValue({
        ...testWorkflow,
        name: 'Updated Name',
      } as any);

      const result = await service.update(testWorkflow.id, testUser.id, {
        name: 'Updated Name',
      });

      expect(result.name).toBe('Updated Name');
    });

    it('should create version when graph is updated', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.update.mockResolvedValue({
        ...testWorkflow,
        graph: simpleWorkflowGraph,
        version: 2,
      } as any);
      prismaService.workflowVersion.create.mockResolvedValue({} as any);

      await service.update(testWorkflow.id, testUser.id, {
        graph: simpleWorkflowGraph,
      });

      expect(prismaService.workflowVersion.create).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete workflow', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.update.mockResolvedValue({
        ...testWorkflow,
        deletedAt: new Date(),
      } as any);

      await service.delete(testWorkflow.id, testUser.id);

      expect(prismaService.workflow.update).toHaveBeenCalledWith({
        where: { id: testWorkflow.id },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('activate', () => {
    it('should activate workflow', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.update.mockResolvedValue({
        ...testWorkflow,
        status: 'ACTIVE',
        isActive: true,
      } as any);

      const result = await service.activate(testWorkflow.id, testUser.id);

      expect(result.status).toBe('ACTIVE');
      expect(result.isActive).toBe(true);
    });
  });

  describe('deactivate', () => {
    it('should deactivate workflow', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        status: 'ACTIVE',
        isActive: true,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.update.mockResolvedValue({
        ...testWorkflow,
        status: 'INACTIVE',
        isActive: false,
      } as any);

      const result = await service.deactivate(testWorkflow.id, testUser.id);

      expect(result.status).toBe('INACTIVE');
      expect(result.isActive).toBe(false);
    });
  });

  describe('duplicate', () => {
    it('should create a copy of the workflow', async () => {
      prismaService.workflow.findUnique.mockResolvedValue({
        ...testWorkflow,
        team: testTeam,
        createdBy: { id: testUser.id, email: testUser.email, name: testUser.name },
        _count: { executions: 0, versions: 1 },
      } as any);
      teamService.checkTeamAccess.mockResolvedValue(undefined);
      prismaService.workflow.create.mockResolvedValue({
        ...testWorkflow,
        id: 'new-workflow-id',
        name: 'Test Workflow (copie)',
        version: 1,
      } as any);
      branchService.createMainBranch.mockResolvedValue({} as any);

      const result = await service.duplicate(testWorkflow.id, testUser.id);

      expect(result.name).toContain('copie');
      expect(prismaService.workflow.create).toHaveBeenCalled();
    });
  });
});
