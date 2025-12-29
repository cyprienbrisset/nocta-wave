import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { RatingStatus, ReportReason, ReportStatus, Prisma } from '@prisma/client';

export interface RatingWithUser {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  review: string | null;
  status: RatingStatus;
  helpfulCount: number;
  reportCount: number;
  authorReply: string | null;
  authorReplyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    avatar: string | null;
  };
}

interface CreateRatingDto {
  rating: number;
  review?: string;
}

interface ReplyToRatingDto {
  reply: string;
}

interface ReportRatingDto {
  reason: ReportReason;
  description?: string;
}

@Injectable()
export class TemplateRatingService {
  private readonly logger = new Logger(TemplateRatingService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Submit a rating for a template
   */
  async submitRating(
    templateId: string,
    userId: string,
    dto: CreateRatingDto,
  ): Promise<RatingWithUser> {
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id: templateId },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if user already rated
    const existingRating = await this.prisma.templateRating.findUnique({
      where: { templateId_userId: { templateId, userId } },
    });

    const rating = await this.prisma.templateRating.upsert({
      where: { templateId_userId: { templateId, userId } },
      create: {
        templateId,
        userId,
        rating: dto.rating,
        review: dto.review,
        status: RatingStatus.PUBLISHED, // Auto-publish, can be moderated later
      },
      update: {
        rating: dto.rating,
        review: dto.review,
        updatedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Update template average rating
    await this.updateTemplateRatingStats(templateId);

    // Notify template owner of new rating
    if (!existingRating && template.createdById && template.createdById !== userId) {
      const raterName = rating.user.name || 'Someone';
      await this.notificationService.notifyTemplateRated(
        template.createdById,
        raterName,
        templateId,
        template.name,
        dto.rating,
      );
    }

    this.logger.log(`User ${userId} rated template ${templateId}: ${dto.rating} stars`);
    return rating;
  }

  /**
   * Get ratings for a template
   */
  async getRatings(
    templateId: string,
    options?: {
      status?: RatingStatus;
      sortBy?: 'newest' | 'helpful' | 'rating';
      limit?: number;
      offset?: number;
    },
  ): Promise<{ ratings: RatingWithUser[]; total: number }> {
    const where: Prisma.TemplateRatingWhereInput = {
      templateId,
      status: options?.status ?? RatingStatus.PUBLISHED,
    };

    const orderBy: Prisma.TemplateRatingOrderByWithRelationInput =
      options?.sortBy === 'helpful'
        ? { helpfulCount: 'desc' }
        : options?.sortBy === 'rating'
          ? { rating: 'desc' }
          : { createdAt: 'desc' };

    const [ratings, total] = await Promise.all([
      this.prisma.templateRating.findMany({
        where,
        orderBy,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
      }),
      this.prisma.templateRating.count({ where }),
    ]);

    return { ratings, total };
  }

  /**
   * Reply to a rating (template author only)
   */
  async replyToRating(
    ratingId: string,
    authorId: string,
    dto: ReplyToRatingDto,
  ): Promise<RatingWithUser> {
    const rating = await this.prisma.templateRating.findUnique({
      where: { id: ratingId },
      include: {
        template: { select: { createdById: true } },
      },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (rating.template.createdById !== authorId) {
      throw new ForbiddenException('Only the template author can reply to ratings');
    }

    const updated = await this.prisma.templateRating.update({
      where: { id: ratingId },
      data: {
        authorReply: dto.reply,
        authorReplyAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    this.logger.log(`Author replied to rating ${ratingId}`);
    return updated;
  }

  /**
   * Mark a rating as helpful
   */
  async markHelpful(ratingId: string, userId: string): Promise<{ helpfulCount: number }> {
    // Check if already marked
    const existing = await this.prisma.ratingHelpful.findUnique({
      where: { ratingId_userId: { ratingId, userId } },
    });

    if (existing) {
      // Remove helpful mark
      await this.prisma.ratingHelpful.delete({
        where: { id: existing.id },
      });
      await this.prisma.templateRating.update({
        where: { id: ratingId },
        data: { helpfulCount: { decrement: 1 } },
      });
    } else {
      // Add helpful mark
      await this.prisma.ratingHelpful.create({
        data: { ratingId, userId },
      });
      await this.prisma.templateRating.update({
        where: { id: ratingId },
        data: { helpfulCount: { increment: 1 } },
      });
    }

    const rating = await this.prisma.templateRating.findUnique({
      where: { id: ratingId },
      select: { helpfulCount: true },
    });

    return { helpfulCount: rating?.helpfulCount || 0 };
  }

  /**
   * Report a rating
   */
  async reportRating(
    ratingId: string,
    reporterId: string,
    dto: ReportRatingDto,
  ): Promise<{ success: boolean }> {
    const rating = await this.prisma.templateRating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Check for existing report
    const existingReport = await this.prisma.ratingReport.findUnique({
      where: { ratingId_reporterId: { ratingId, reporterId } },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this rating');
    }

    await this.prisma.$transaction([
      this.prisma.ratingReport.create({
        data: {
          ratingId,
          reporterId,
          reason: dto.reason,
          description: dto.description,
        },
      }),
      this.prisma.templateRating.update({
        where: { id: ratingId },
        data: { reportCount: { increment: 1 } },
      }),
    ]);

    // Auto-hide if too many reports
    if (rating.reportCount + 1 >= 3) {
      await this.prisma.templateRating.update({
        where: { id: ratingId },
        data: { status: RatingStatus.HIDDEN },
      });
      this.logger.warn(`Rating ${ratingId} auto-hidden due to reports`);
    }

    this.logger.log(`Rating ${ratingId} reported by ${reporterId}: ${dto.reason}`);
    return { success: true };
  }

  /**
   * Moderate a rating (admin only)
   */
  async moderateRating(
    ratingId: string,
    moderatorId: string,
    action: 'approve' | 'hide' | 'remove',
  ): Promise<RatingWithUser> {
    const rating = await this.prisma.templateRating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    const newStatus =
      action === 'approve'
        ? RatingStatus.PUBLISHED
        : action === 'hide'
          ? RatingStatus.HIDDEN
          : RatingStatus.REMOVED;

    const updated = await this.prisma.templateRating.update({
      where: { id: ratingId },
      data: { status: newStatus },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    // Resolve all pending reports
    await this.prisma.ratingReport.updateMany({
      where: { ratingId, status: ReportStatus.PENDING },
      data: {
        status: ReportStatus.RESOLVED,
        resolvedAt: new Date(),
        resolvedById: moderatorId,
      },
    });

    // Update template rating stats
    await this.updateTemplateRatingStats(rating.templateId);

    this.logger.log(`Rating ${ratingId} moderated to ${newStatus} by ${moderatorId}`);
    return updated;
  }

  /**
   * Get moderation queue (admin only)
   */
  async getModerationQueue(options?: {
    limit?: number;
    offset?: number;
  }): Promise<{ ratings: RatingWithUser[]; total: number }> {
    const where: Prisma.TemplateRatingWhereInput = {
      OR: [{ status: RatingStatus.PENDING }, { reportCount: { gte: 1 } }],
    };

    const [ratings, total] = await Promise.all([
      this.prisma.templateRating.findMany({
        where,
        orderBy: { reportCount: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
          reports: {
            include: {
              rating: false,
            },
          },
        },
      }),
      this.prisma.templateRating.count({ where }),
    ]);

    return { ratings: ratings as RatingWithUser[], total };
  }

  /**
   * Delete user's own rating
   */
  async deleteRating(ratingId: string, userId: string): Promise<void> {
    const rating = await this.prisma.templateRating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    if (rating.userId !== userId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    await this.prisma.templateRating.delete({ where: { id: ratingId } });
    await this.updateTemplateRatingStats(rating.templateId);

    this.logger.log(`User ${userId} deleted their rating ${ratingId}`);
  }

  /**
   * Update template's rating statistics
   */
  private async updateTemplateRatingStats(templateId: string): Promise<void> {
    const stats = await this.prisma.templateRating.aggregate({
      where: {
        templateId,
        status: RatingStatus.PUBLISHED,
      },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: {
        avgRating: stats._avg.rating || 0,
        ratingCount: stats._count.rating,
      },
    });
  }
}
