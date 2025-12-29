import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SuggestionStatus, ReviewStatus, Prisma } from '@prisma/client';

export interface SuggestionWithDetails {
  id: string;
  workflowId: string;
  branchId: string | null;
  authorId: string;
  title: string;
  description: string | null;
  status: SuggestionStatus;
  graphChanges: Prisma.JsonValue;
  requiredApprovals: number;
  createdAt: Date;
  updatedAt: Date;
  mergedAt: Date | null;
  mergedById: string | null;
  closedAt: Date | null;
  author: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
  reviews: {
    id: string;
    reviewerId: string;
    status: ReviewStatus;
    comment: string | null;
    createdAt: Date;
    reviewer: {
      id: string;
      name: string | null;
      avatar: string | null;
    };
  }[];
  _count: {
    comments: number;
  };
}

interface CreateSuggestionDto {
  title: string;
  description?: string;
  graphChanges: Prisma.InputJsonValue;
  requiredApprovals?: number;
}

interface AddReviewDto {
  status: ReviewStatus;
  comment?: string;
}

interface AddCommentDto {
  content: string;
  parentId?: string;
}

@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Create a new suggestion
   */
  async create(
    workflowId: string,
    authorId: string,
    teamId: string,
    dto: CreateSuggestionDto,
  ): Promise<SuggestionWithDetails> {
    // Verify workflow exists and user has access
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, teamId },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const suggestion = await this.prisma.suggestion.create({
      data: {
        workflowId,
        authorId,
        title: dto.title,
        description: dto.description,
        graphChanges: dto.graphChanges,
        requiredApprovals: dto.requiredApprovals ?? 1,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    // Get author name
    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });

    // Notify workflow owner
    if (workflow.createdById !== authorId) {
      await this.notificationService.notifySuggestionReceived(
        workflow.createdById,
        author?.name || 'Someone',
        dto.title,
        suggestion.id,
        workflowId,
        workflow.name,
      );
    }

    this.logger.log(`Suggestion ${suggestion.id} created for workflow ${workflowId}`);
    return suggestion;
  }

  /**
   * Get suggestions for a workflow
   */
  async getForWorkflow(
    workflowId: string,
    teamId: string,
    options?: {
      status?: SuggestionStatus;
      authorId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ suggestions: SuggestionWithDetails[]; total: number }> {
    // Verify access
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, teamId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const where: Prisma.SuggestionWhereInput = {
      workflowId,
      ...(options?.status && { status: options.status }),
      ...(options?.authorId && { authorId: options.authorId }),
    };

    const [suggestions, total] = await Promise.all([
      this.prisma.suggestion.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          reviews: {
            include: {
              reviewer: { select: { id: true, name: true, avatar: true } },
            },
          },
          _count: { select: { comments: true } },
        },
      }),
      this.prisma.suggestion.count({ where }),
    ]);

    return { suggestions, total };
  }

  /**
   * Get suggestion by ID
   */
  async findById(id: string, teamId: string): Promise<SuggestionWithDetails> {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id },
      include: {
        workflow: { select: { teamId: true } },
        author: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    return suggestion;
  }

  /**
   * Add a review to a suggestion
   */
  async addReview(
    suggestionId: string,
    reviewerId: string,
    teamId: string,
    dto: AddReviewDto,
  ): Promise<SuggestionWithDetails> {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        workflow: { select: { teamId: true, name: true } },
        author: { select: { id: true, name: true } },
      },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.authorId === reviewerId) {
      throw new BadRequestException('Cannot review your own suggestion');
    }

    if (suggestion.status !== SuggestionStatus.PENDING && suggestion.status !== SuggestionStatus.IN_REVIEW) {
      throw new BadRequestException('Cannot review a suggestion that is not pending or in review');
    }

    // Upsert review
    await this.prisma.suggestionReview.upsert({
      where: {
        suggestionId_reviewerId: { suggestionId, reviewerId },
      },
      create: {
        suggestionId,
        reviewerId,
        status: dto.status,
        comment: dto.comment,
      },
      update: {
        status: dto.status,
        comment: dto.comment,
        updatedAt: new Date(),
      },
    });

    // Get reviewer name
    const reviewer = await this.prisma.user.findUnique({
      where: { id: reviewerId },
      select: { name: true },
    });
    const reviewerName = reviewer?.name || 'Someone';

    // Check approval status and notify author
    const reviews = await this.prisma.suggestionReview.findMany({
      where: { suggestionId },
    });

    const approvals = reviews.filter((r) => r.status === ReviewStatus.APPROVED).length;
    const changesRequested = reviews.filter((r) => r.status === ReviewStatus.CHANGES_REQUESTED).length;

    let newStatus: SuggestionStatus = suggestion.status;

    if (approvals >= suggestion.requiredApprovals) {
      newStatus = SuggestionStatus.APPROVED;
      await this.notificationService.notifySuggestionApproved(
        suggestion.authorId,
        reviewerName,
        suggestion.title,
        suggestionId,
        suggestion.workflowId,
      );
    } else if (changesRequested > 0 && dto.status === ReviewStatus.CHANGES_REQUESTED) {
      await this.notificationService.notifySuggestionRejected(
        suggestion.authorId,
        reviewerName,
        suggestion.title,
        suggestionId,
        suggestion.workflowId,
        dto.comment,
      );
    }

    // Update suggestion status
    await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: { status: newStatus },
    });

    this.logger.log(`Review added to suggestion ${suggestionId} by ${reviewerId}: ${dto.status}`);

    return this.findById(suggestionId, teamId);
  }

  /**
   * Merge an approved suggestion
   */
  async merge(
    suggestionId: string,
    mergerId: string,
    teamId: string,
  ): Promise<SuggestionWithDetails> {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: {
        workflow: true,
        author: { select: { id: true, name: true } },
      },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    if (suggestion.status !== SuggestionStatus.APPROVED) {
      throw new BadRequestException('Can only merge approved suggestions');
    }

    // Apply the graph changes to the workflow
    const currentGraph = suggestion.workflow.graph as Record<string, unknown>;
    const changes = suggestion.graphChanges as Record<string, unknown>;

    // Simple merge strategy: replace with changed graph
    // In production, you'd want a more sophisticated diff/merge
    const mergedGraph = this.applyGraphChanges(currentGraph, changes);

    // Update workflow with merged changes
    await this.prisma.workflow.update({
      where: { id: suggestion.workflowId },
      data: {
        graph: mergedGraph as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });

    // Update suggestion status
    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.MERGED,
        mergedAt: new Date(),
        mergedById: mergerId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    // Get merger name and notify author
    const merger = await this.prisma.user.findUnique({
      where: { id: mergerId },
      select: { name: true },
    });

    if (suggestion.authorId !== mergerId) {
      await this.notificationService.notifySuggestionMerged(
        suggestion.authorId,
        merger?.name || 'Someone',
        suggestion.title,
        suggestionId,
        suggestion.workflowId,
      );
    }

    this.logger.log(`Suggestion ${suggestionId} merged by ${mergerId}`);
    return updated;
  }

  /**
   * Close a suggestion without merging
   */
  async close(
    suggestionId: string,
    userId: string,
    teamId: string,
  ): Promise<SuggestionWithDetails> {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: { workflow: { select: { teamId: true, createdById: true } } },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    // Only author or workflow owner can close
    if (suggestion.authorId !== userId && suggestion.workflow.createdById !== userId) {
      throw new ForbiddenException('Only the author or workflow owner can close suggestions');
    }

    const updated = await this.prisma.suggestion.update({
      where: { id: suggestionId },
      data: {
        status: SuggestionStatus.CLOSED,
        closedAt: new Date(),
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
        reviews: {
          include: {
            reviewer: { select: { id: true, name: true, avatar: true } },
          },
        },
        _count: { select: { comments: true } },
      },
    });

    this.logger.log(`Suggestion ${suggestionId} closed by ${userId}`);
    return updated;
  }

  /**
   * Add a comment to a suggestion
   */
  async addComment(
    suggestionId: string,
    authorId: string,
    teamId: string,
    dto: AddCommentDto,
  ) {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: { workflow: { select: { teamId: true } } },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    return this.prisma.suggestionComment.create({
      data: {
        suggestionId,
        authorId,
        content: dto.content,
        parentId: dto.parentId,
      },
      include: {
        author: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Get comments for a suggestion
   */
  async getComments(
    suggestionId: string,
    teamId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const suggestion = await this.prisma.suggestion.findUnique({
      where: { id: suggestionId },
      include: { workflow: { select: { teamId: true } } },
    });

    if (!suggestion || suggestion.workflow.teamId !== teamId) {
      throw new NotFoundException('Suggestion not found');
    }

    const [comments, total] = await Promise.all([
      this.prisma.suggestionComment.findMany({
        where: { suggestionId, parentId: null },
        orderBy: { createdAt: 'asc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
        include: {
          author: { select: { id: true, name: true, avatar: true } },
          replies: {
            include: {
              author: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.suggestionComment.count({ where: { suggestionId } }),
    ]);

    return { comments, total };
  }

  /**
   * Get approval status for a suggestion
   */
  async getApprovalStatus(suggestionId: string, teamId: string) {
    const suggestion = await this.findById(suggestionId, teamId);

    const reviews = await this.prisma.suggestionReview.findMany({
      where: { suggestionId },
      include: {
        reviewer: { select: { id: true, name: true, avatar: true } },
      },
    });

    const approvals = reviews.filter((r) => r.status === ReviewStatus.APPROVED);
    const changesRequested = reviews.filter((r) => r.status === ReviewStatus.CHANGES_REQUESTED);

    return {
      required: suggestion.requiredApprovals,
      current: approvals.length,
      isApproved: approvals.length >= suggestion.requiredApprovals,
      approvals,
      changesRequested,
    };
  }

  /**
   * Apply graph changes (simplified merge)
   */
  private applyGraphChanges(
    currentGraph: Record<string, unknown>,
    changes: Record<string, unknown>,
  ): Record<string, unknown> {
    // For now, just replace with the changed graph
    // A more sophisticated implementation would:
    // 1. Parse the diff format
    // 2. Apply node additions/removals
    // 3. Apply node modifications
    // 4. Apply edge changes
    // 5. Handle conflicts

    if (changes.fullGraph) {
      return changes.fullGraph as Record<string, unknown>;
    }

    // Deep merge
    return {
      ...currentGraph,
      ...changes,
      nodes: changes.nodes ?? currentGraph.nodes,
      edges: changes.edges ?? currentGraph.edges,
    };
  }
}
