import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  CreateWorkflowFromTemplateDto,
} from './dto/template.dto';

@Injectable()
export class TemplateService {
  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
  ) {}

  async create(teamId: string | null, userId: string, dto: CreateTemplateDto) {
    // If teamId is provided, verify access
    if (teamId) {
      await this.teamService.checkTeamAccess(teamId, userId, [
        'OWNER',
        'ADMIN',
        'MEMBER',
      ]);
    }

    return this.prisma.workflowTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        graph: dto.graph,
        settings: dto.settings,
        isPublic: dto.isPublic || false,
        teamId,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findAll(userId: string, teamId?: string, query?: TemplateQueryDto) {
    const where: any = {
      OR: [
        { isPublic: true },
      ],
    };

    // If teamId is provided, include team templates
    if (teamId) {
      await this.teamService.checkTeamAccess(teamId, userId, [
        'OWNER',
        'ADMIN',
        'MEMBER',
        'VIEWER',
      ]);
      where.OR.push({ teamId });
    }

    // Also include user's own templates from other teams
    where.OR.push({ createdById: userId });

    if (query?.category) {
      where.category = query.category;
    }

    if (query?.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { description: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    if (query?.publicOnly) {
      where.isPublic = true;
    }

    const [templates, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ usageCount: 'desc' }, { createdAt: 'desc' }],
        skip: query?.skip || 0,
        take: query?.take || 20,
      }),
      this.prisma.workflowTemplate.count({ where }),
    ]);

    return {
      data: templates,
      total,
      page: Math.floor((query?.skip || 0) / (query?.take || 20)) + 1,
      pageSize: query?.take || 20,
    };
  }

  async findById(id: string, userId: string) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check access: public templates are accessible to all
    // Private templates require team access
    if (!template.isPublic && template.teamId) {
      await this.teamService.checkTeamAccess(template.teamId, userId, [
        'OWNER',
        'ADMIN',
        'MEMBER',
        'VIEWER',
      ]);
    } else if (!template.isPublic && template.createdById !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return template;
  }

  async update(id: string, userId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Only creator or team admin can update
    if (template.teamId) {
      await this.teamService.checkTeamAccess(template.teamId, userId, [
        'OWNER',
        'ADMIN',
      ]);
    } else if (template.createdById !== userId) {
      throw new ForbiddenException('Only the creator can update this template');
    }

    return this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        graph: dto.graph,
        settings: dto.settings,
        isPublic: dto.isPublic,
      },
    });
  }

  async delete(id: string, userId: string) {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Only creator or team admin can delete
    if (template.teamId) {
      await this.teamService.checkTeamAccess(template.teamId, userId, [
        'OWNER',
        'ADMIN',
      ]);
    } else if (template.createdById !== userId) {
      throw new ForbiddenException('Only the creator can delete this template');
    }

    await this.prisma.workflowTemplate.delete({
      where: { id },
    });

    return { message: 'Template deleted successfully' };
  }

  async createWorkflowFromTemplate(
    templateId: string,
    teamId: string,
    userId: string,
    dto: CreateWorkflowFromTemplateDto,
  ) {
    const template = await this.findById(templateId, userId);

    // Verify team access for creating workflow
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Create workflow from template
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name || template.name,
        description: dto.description || template.description,
        teamId,
        createdById: userId,
        graph: template.graph as any,
        settings: template.settings as any,
        status: 'DRAFT',
      },
    });

    // Increment usage count
    await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: { usageCount: { increment: 1 } },
    });

    return workflow;
  }

  async getCategories() {
    const categories = await this.prisma.workflowTemplate.groupBy({
      by: ['category'],
      _count: { category: true },
      where: { isPublic: true },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.category,
    }));
  }

  async createFromWorkflow(workflowId: string, userId: string, dto: Partial<CreateTemplateDto>) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.workflowTemplate.create({
      data: {
        name: dto.name || `${workflow.name} Template`,
        description: dto.description || workflow.description,
        category: dto.category || 'custom',
        icon: dto.icon,
        graph: workflow.graph as any,
        settings: workflow.settings as any,
        isPublic: dto.isPublic || false,
        teamId: workflow.teamId,
        createdById: userId,
      },
    });
  }
}
