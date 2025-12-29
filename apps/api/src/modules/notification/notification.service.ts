import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import { CreateNotificationDto, NotificationCountDto } from './notification.dto';

export interface NotificationWithUser {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Prisma.JsonValue | null;
  read: boolean;
  readAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification
   */
  async create(dto: CreateNotificationDto): Promise<NotificationWithUser> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data ? (dto.data as Prisma.InputJsonValue) : undefined,
      },
    });

    this.logger.log(`Notification created for user ${dto.userId}: ${dto.type}`);
    return notification;
  }

  /**
   * Create multiple notifications (batch)
   */
  async createMany(notifications: CreateNotificationDto[]): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data ? (n.data as Prisma.InputJsonValue) : undefined,
      })),
    });

    this.logger.log(`Created ${result.count} notifications in batch`);
    return result.count;
  }

  /**
   * Create notification for mention
   */
  async notifyMention(
    mentionedUserId: string,
    mentionerName: string,
    context: {
      type: 'comment' | 'chat' | 'suggestion';
      workflowId?: string;
      workflowName?: string;
      commentId?: string;
      messageId?: string;
      suggestionId?: string;
    },
  ): Promise<NotificationWithUser> {
    const contextText =
      context.type === 'comment'
        ? 'dans un commentaire'
        : context.type === 'chat'
          ? 'dans le chat'
          : 'dans une suggestion';

    return this.create({
      userId: mentionedUserId,
      type: NotificationType.MENTION,
      title: `${mentionerName} vous a mentionné`,
      message: `${mentionerName} vous a mentionné ${contextText}${context.workflowName ? ` sur "${context.workflowName}"` : ''}.`,
      data: {
        mentionerName,
        ...context,
      },
    });
  }

  /**
   * Create notification for comment reply
   */
  async notifyCommentReply(
    originalAuthorId: string,
    replierName: string,
    workflowId: string,
    workflowName: string,
    commentId: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: originalAuthorId,
      type: NotificationType.COMMENT_REPLY,
      title: `${replierName} a répondu à votre commentaire`,
      message: `${replierName} a répondu à votre commentaire sur "${workflowName}".`,
      data: {
        replierName,
        workflowId,
        workflowName,
        commentId,
      },
    });
  }

  /**
   * Create notification for suggestion received
   */
  async notifySuggestionReceived(
    workflowOwnerId: string,
    authorName: string,
    suggestionTitle: string,
    suggestionId: string,
    workflowId: string,
    workflowName: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: workflowOwnerId,
      type: NotificationType.SUGGESTION_RECEIVED,
      title: `Nouvelle suggestion de ${authorName}`,
      message: `${authorName} a proposé "${suggestionTitle}" pour le workflow "${workflowName}".`,
      data: {
        authorName,
        suggestionId,
        suggestionTitle,
        workflowId,
        workflowName,
      },
    });
  }

  /**
   * Create notification for suggestion approved
   */
  async notifySuggestionApproved(
    authorId: string,
    reviewerName: string,
    suggestionTitle: string,
    suggestionId: string,
    workflowId: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: authorId,
      type: NotificationType.SUGGESTION_APPROVED,
      title: `Suggestion approuvée`,
      message: `${reviewerName} a approuvé votre suggestion "${suggestionTitle}".`,
      data: {
        reviewerName,
        suggestionId,
        suggestionTitle,
        workflowId,
      },
    });
  }

  /**
   * Create notification for suggestion rejected
   */
  async notifySuggestionRejected(
    authorId: string,
    reviewerName: string,
    suggestionTitle: string,
    suggestionId: string,
    workflowId: string,
    reason?: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: authorId,
      type: NotificationType.SUGGESTION_REJECTED,
      title: `Suggestion refusée`,
      message: `${reviewerName} a refusé votre suggestion "${suggestionTitle}"${reason ? `: ${reason}` : '.'}`,
      data: {
        reviewerName,
        suggestionId,
        suggestionTitle,
        workflowId,
        reason,
      },
    });
  }

  /**
   * Create notification for suggestion merged
   */
  async notifySuggestionMerged(
    authorId: string,
    mergerName: string,
    suggestionTitle: string,
    suggestionId: string,
    workflowId: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: authorId,
      type: NotificationType.SUGGESTION_MERGED,
      title: `Suggestion fusionnée`,
      message: `${mergerName} a fusionné votre suggestion "${suggestionTitle}".`,
      data: {
        mergerName,
        suggestionId,
        suggestionTitle,
        workflowId,
      },
    });
  }

  /**
   * Create notification for workflow shared
   */
  async notifyWorkflowShared(
    sharedWithUserId: string,
    sharerName: string,
    workflowId: string,
    workflowName: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: sharedWithUserId,
      type: NotificationType.WORKFLOW_SHARED,
      title: `${sharerName} a partagé un workflow`,
      message: `${sharerName} a partagé le workflow "${workflowName}" avec vous.`,
      data: {
        sharerName,
        workflowId,
        workflowName,
      },
    });
  }

  /**
   * Create notification for template shared
   */
  async notifyTemplateShared(
    sharedWithUserId: string,
    sharerName: string,
    templateId: string,
    templateName: string,
    teamName: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: sharedWithUserId,
      type: NotificationType.TEMPLATE_SHARED,
      title: `Nouveau template partagé`,
      message: `${sharerName} a partagé le template "${templateName}" avec l'équipe "${teamName}".`,
      data: {
        sharerName,
        templateId,
        templateName,
        teamName,
      },
    });
  }

  /**
   * Create notification for template rated
   */
  async notifyTemplateRated(
    templateOwnerId: string,
    raterName: string,
    templateId: string,
    templateName: string,
    rating: number,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: templateOwnerId,
      type: NotificationType.TEMPLATE_RATED,
      title: `Nouvelle évaluation`,
      message: `${raterName} a donné ${rating} étoile${rating > 1 ? 's' : ''} à votre template "${templateName}".`,
      data: {
        raterName,
        templateId,
        templateName,
        rating,
      },
    });
  }

  /**
   * Create notification for PR review requested
   */
  async notifyPRReviewRequested(
    reviewerId: string,
    authorName: string,
    prTitle: string,
    prId: string,
    workflowId: string,
    workflowName: string,
  ): Promise<NotificationWithUser> {
    return this.create({
      userId: reviewerId,
      type: NotificationType.PR_REVIEW_REQUESTED,
      title: `Review demandée`,
      message: `${authorName} vous a demandé de reviewer "${prTitle}" sur "${workflowName}".`,
      data: {
        authorName,
        prId,
        prTitle,
        workflowId,
        workflowName,
      },
    });
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      read?: boolean;
      type?: NotificationType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ notifications: NotificationWithUser[]; total: number }> {
    const where: Prisma.NotificationWhereInput = { userId };

    if (options?.read !== undefined) {
      where.read = options.read;
    }

    if (options?.type) {
      where.type = options.type;
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return { notifications, total };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<NotificationCountDto> {
    const unreadByType = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { userId, read: false },
      _count: true,
    });

    const byType: Record<string, number> = {};
    let total = 0;

    for (const item of unreadByType) {
      byType[item.type] = item._count;
      total += item._count;
    }

    return { unread: total, byType };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<NotificationWithUser> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(notificationIds: string[], userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
      },
      data: { read: true, readAt: new Date() },
    });

    return result.count;
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    this.logger.log(`Marked ${result.count} notifications as read for user ${userId}`);
    return result.count;
  }

  /**
   * Delete old notifications (cleanup job)
   */
  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        read: true,
      },
    });

    this.logger.log(`Deleted ${result.count} old notifications`);
    return result.count;
  }

  /**
   * Delete a notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }
}
