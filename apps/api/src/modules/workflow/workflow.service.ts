import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import { BranchService } from '../branch/branch.service';
import { Prisma, WorkflowStatus } from '@prisma/client';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowQueryDto,
} from './dto/workflow.dto';
import {
  WorkflowGraph,
  WorkflowSettings,
  WorkflowNode,
  WorkflowEdge,
  toWorkflowGraph,
  toWorkflowSettings,
  NodeModification,
} from '@ws-flows/shared';

/**
 * Version diff modification type - exported for controller return type
 */
export interface VersionDiffNodeModification {
  current: WorkflowNode;
  previous: WorkflowNode;
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
    @Inject(forwardRef(() => BranchService))
    private branchService: BranchService,
  ) {}

  async create(userId: string, teamId: string, dto: CreateWorkflowDto) {
    // Verify team access
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    const graph = dto.graph || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };

    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description,
        teamId,
        createdById: userId,
        graph,
        settings: dto.settings,
      },
    });

    // Create main branch for the workflow
    try {
      await this.branchService.createMainBranch(
        workflow.id,
        userId,
        graph,
        dto.settings,
      );
    } catch (error) {
      // If branch creation fails, don't fail the workflow creation
      this.logger.error('Failed to create main branch:', error);
    }

    return workflow;
  }

  async findById(id: string, userId?: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id },
      include: {
        team: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        webhooks: true,
        schedules: true,
        _count: {
          select: {
            executions: true,
            versions: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Optional: verify access
    if (userId) {
      await this.teamService.checkTeamAccess(workflow.teamId, userId, [
        'OWNER',
        'ADMIN',
        'MEMBER',
        'VIEWER',
      ]);
    }

    return workflow;
  }

  async findByTeam(teamId: string, userId: string, query: WorkflowQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    const where: Prisma.WorkflowWhereInput = { teamId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [workflows, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              executions: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip: query.skip || 0,
        take: query.take || 20,
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return {
      data: workflows,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 20)) + 1,
      pageSize: query.take || 20,
    };
  }

  async update(id: string, userId: string, dto: UpdateWorkflowDto) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Create version before updating if graph changed
    if (dto.graph) {
      await this.prisma.workflowVersion.create({
        data: {
          workflowId: id,
          version: workflow.version,
          graph: workflow.graph as Prisma.InputJsonValue,
          settings: workflow.settings as Prisma.InputJsonValue,
          changelog: dto.changelog,
        },
      });
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        graph: dto.graph,
        settings: dto.settings,
        status: dto.status,
        isActive: dto.isActive,
        version: dto.graph ? { increment: 1 } : undefined,
      },
    });
  }

  async delete(id: string, userId: string) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    await this.prisma.workflow.delete({
      where: { id },
    });

    return { message: 'Workflow deleted successfully' };
  }

  async duplicate(id: string, userId: string) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.workflow.create({
      data: {
        name: `${workflow.name} (Copy)`,
        description: workflow.description,
        teamId: workflow.teamId,
        createdById: userId,
        graph: workflow.graph as Prisma.InputJsonValue,
        settings: workflow.settings as Prisma.InputJsonValue,
        status: 'DRAFT',
      },
    });
  }

  async activate(id: string, userId: string) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.workflow.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        isActive: true,
      },
    });
  }

  async deactivate(id: string, userId: string) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.workflow.update({
      where: { id },
      data: {
        status: 'INACTIVE',
        isActive: false,
      },
    });
  }

  async getVersions(id: string, userId: string) {
    const workflow = await this.findById(id, userId);

    return this.prisma.workflowVersion.findMany({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        changelog: true,
        createdAt: true,
      },
    });
  }

  async restoreVersion(id: string, versionId: string, userId: string) {
    const workflow = await this.findById(id);

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.workflowId !== id) {
      throw new NotFoundException('Version not found');
    }

    // Save current as new version
    await this.prisma.workflowVersion.create({
      data: {
        workflowId: id,
        version: workflow.version,
        graph: workflow.graph as Prisma.InputJsonValue,
        settings: workflow.settings as Prisma.InputJsonValue,
        changelog: 'Auto-saved before restore',
      },
    });

    // Restore
    return this.prisma.workflow.update({
      where: { id },
      data: {
        graph: version.graph as Prisma.InputJsonValue,
        settings: version.settings as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
  }

  async exportWorkflow(id: string, userId: string) {
    const workflow = await this.findById(id, userId);

    // Create export format with metadata
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      workflow: {
        name: workflow.name,
        description: workflow.description,
        graph: workflow.graph,
        settings: workflow.settings,
      },
    };
  }

  async importWorkflow(userId: string, teamId: string, data: any) {
    // Verify team access
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Validate import format
    if (!data.workflow || !data.workflow.graph) {
      throw new NotFoundException('Invalid workflow format');
    }

    const workflowData = data.workflow;

    return this.prisma.workflow.create({
      data: {
        name: workflowData.name || 'Imported Workflow',
        description: workflowData.description,
        teamId,
        createdById: userId,
        graph: workflowData.graph,
        settings: workflowData.settings,
        status: 'DRAFT',
      },
    });
  }

  async getVersion(id: string, versionId: string, userId: string) {
    await this.findById(id, userId);

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.workflowId !== id) {
      throw new NotFoundException('Version not found');
    }

    return version;
  }

  async getVersionDiff(id: string, versionId: string, userId: string) {
    const workflow = await this.findById(id, userId);

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });

    if (!version || version.workflowId !== id) {
      throw new NotFoundException('Version not found');
    }

    const currentGraph = toWorkflowGraph(workflow.graph);
    const versionGraph = toWorkflowGraph(version.graph);

    // Calculate diff with proper types
    const diff: {
      version: number;
      currentVersion: number;
      changelog: string | null;
      createdAt: Date;
      changes: {
        nodes: {
          added: WorkflowNode[];
          removed: WorkflowNode[];
          modified: VersionDiffNodeModification[];
        };
        edges: {
          added: WorkflowEdge[];
          removed: WorkflowEdge[];
        };
      };
    } = {
      version: version.version,
      currentVersion: workflow.version,
      changelog: version.changelog,
      createdAt: version.createdAt,
      changes: {
        nodes: {
          added: [],
          removed: [],
          modified: [],
        },
        edges: {
          added: [],
          removed: [],
        },
      },
    };

    // Find node changes
    const currentNodeIds = new Set(currentGraph.nodes.map((n) => n.id));
    const versionNodeIds = new Set(versionGraph.nodes.map((n) => n.id));

    // Added nodes (in current but not in version)
    diff.changes.nodes.added = currentGraph.nodes.filter(
      (n) => !versionNodeIds.has(n.id),
    );

    // Removed nodes (in version but not in current)
    diff.changes.nodes.removed = versionGraph.nodes.filter(
      (n) => !currentNodeIds.has(n.id),
    );

    // Modified nodes
    const versionNodesMap = new Map<string, WorkflowNode>(
      versionGraph.nodes.map((n) => [n.id, n]),
    );
    diff.changes.nodes.modified = currentGraph.nodes
      .filter((n) => {
        const versionNode = versionNodesMap.get(n.id);
        if (!versionNode) return false;
        return JSON.stringify(n) !== JSON.stringify(versionNode);
      })
      .map((n) => ({
        current: n,
        previous: versionNodesMap.get(n.id)!,
      }));

    // Find edge changes
    const currentEdgeIds = new Set(
      currentGraph.edges.map((e) => `${e.source}-${e.target}`),
    );
    const versionEdgeIds = new Set(
      versionGraph.edges.map((e) => `${e.source}-${e.target}`),
    );

    diff.changes.edges.added = currentGraph.edges.filter(
      (e) => !versionEdgeIds.has(`${e.source}-${e.target}`),
    );

    diff.changes.edges.removed = versionGraph.edges.filter(
      (e) => !currentEdgeIds.has(`${e.source}-${e.target}`),
    );

    return diff;
  }
}
