import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto } from './dto/comment.dto';

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
  ) {}

  async create(userId: string, dto: CreateCommentDto) {
    // Get workflow to check team access
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Verify team access
    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // If parentId is provided, verify it exists and belongs to same workflow
    if (dto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
      });

      if (!parentComment || parentComment.workflowId !== dto.workflowId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    return this.prisma.comment.create({
      data: {
        workflowId: dto.workflowId,
        nodeId: dto.nodeId,
        authorId: userId,
        content: dto.content,
        parentId: dto.parentId,
        position: dto.position as Prisma.InputJsonValue | undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
  }

  async findByWorkflow(workflowId: string, userId: string, query?: CommentQueryDto) {
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

    const where: any = {
      workflowId,
      parentId: null, // Only get top-level comments
    };

    if (query?.nodeId) {
      where.nodeId = query.nodeId;
    }

    if (query?.resolved !== undefined) {
      where.resolved = query.resolved;
    }

    return this.prisma.comment.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        workflow: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.teamService.checkTeamAccess(comment.workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    return comment;
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author can edit content, but anyone with access can resolve
    if (dto.content && comment.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this comment');
    }

    await this.teamService.checkTeamAccess(comment.workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.comment.update({
      where: { id },
      data: {
        content: dto.content,
        resolved: dto.resolved,
        position: dto.position as Prisma.InputJsonValue | undefined,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only author or admin can delete
    const member = await this.teamService.checkTeamAccess(
      comment.workflow.teamId,
      userId,
      ['OWNER', 'ADMIN', 'MEMBER'],
    );

    if (comment.authorId !== userId && !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }

  async resolve(id: string, userId: string) {
    return this.update(id, userId, { resolved: true });
  }

  async unresolve(id: string, userId: string) {
    return this.update(id, userId, { resolved: false });
  }
}
