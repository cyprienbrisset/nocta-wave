import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import { CreateTagDto, UpdateTagDto, TagQueryDto } from './dto/tag.dto';

@Injectable()
export class TagService {
  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
  ) {}

  async create(teamId: string, userId: string, dto: CreateTagDto) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Check for duplicate name in team
    const existing = await this.prisma.tag.findUnique({
      where: {
        name_teamId: {
          name: dto.name,
          teamId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Tag with this name already exists');
    }

    return this.prisma.tag.create({
      data: {
        name: dto.name,
        color: dto.color || '#6366f1',
        teamId,
      },
    });
  }

  async findByTeam(teamId: string, userId: string, query?: TagQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    const where: any = { teamId };

    if (query?.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    return this.prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { workflows: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string, userId: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
      include: {
        workflows: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.teamService.checkTeamAccess(tag.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    return tag;
  }

  async update(id: string, userId: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.teamService.checkTeamAccess(tag.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    // Check for duplicate name if changing
    if (dto.name && dto.name !== tag.name) {
      const existing = await this.prisma.tag.findUnique({
        where: {
          name_teamId: {
            name: dto.name,
            teamId: tag.teamId,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Tag with this name already exists');
      }
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        color: dto.color,
      },
    });
  }

  async delete(id: string, userId: string) {
    const tag = await this.prisma.tag.findUnique({
      where: { id },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.teamService.checkTeamAccess(tag.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    await this.prisma.tag.delete({
      where: { id },
    });

    return { message: 'Tag deleted successfully' };
  }

  async assignToWorkflow(workflowId: string, tagId: string, userId: string) {
    const [workflow, tag] = await Promise.all([
      this.prisma.workflow.findUnique({ where: { id: workflowId } }),
      this.prisma.tag.findUnique({ where: { id: tagId } }),
    ]);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Ensure tag and workflow belong to same team
    if (workflow.teamId !== tag.teamId) {
      throw new ConflictException('Tag and workflow must belong to the same team');
    }

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Check if already assigned
    const existing = await this.prisma.workflowTag.findUnique({
      where: {
        workflowId_tagId: { workflowId, tagId },
      },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.workflowTag.create({
      data: { workflowId, tagId },
      include: {
        tag: true,
      },
    });
  }

  async removeFromWorkflow(workflowId: string, tagId: string, userId: string) {
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

    await this.prisma.workflowTag.deleteMany({
      where: { workflowId, tagId },
    });

    return { message: 'Tag removed from workflow' };
  }

  async getWorkflowTags(workflowId: string, userId: string) {
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
      'VIEWER',
    ]);

    return this.prisma.workflowTag.findMany({
      where: { workflowId },
      include: { tag: true },
    });
  }
}
