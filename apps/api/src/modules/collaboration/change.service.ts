import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChangeType } from '@prisma/client';

export interface WorkflowChangeWithUser {
  id: string;
  workflowId: string;
  changeType: ChangeType;
  nodeId: string | null;
  edgeId: string | null;
  previousData: any;
  newData: any;
  description: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

@Injectable()
export class ChangeService {
  private readonly logger = new Logger(ChangeService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a workflow change
   */
  async recordChange(
    workflowId: string,
    userId: string,
    changeType: ChangeType,
    options?: {
      nodeId?: string;
      edgeId?: string;
      previousData?: Record<string, unknown>;
      newData?: Record<string, unknown>;
      description?: string;
    },
  ): Promise<WorkflowChangeWithUser> {
    // Auto-generate description if not provided
    const description = options?.description || this.generateDescription(changeType, options);

    const change = await this.prisma.workflowChange.create({
      data: {
        workflowId,
        userId,
        changeType,
        nodeId: options?.nodeId,
        edgeId: options?.edgeId,
        previousData: options?.previousData as any,
        newData: options?.newData as any,
        description,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.debug(`Change recorded: ${changeType} in workflow ${workflowId}`);

    return change;
  }

  /**
   * Get recent changes for a workflow
   */
  async getRecentChanges(
    workflowId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: Date;
      changeTypes?: ChangeType[];
    },
  ): Promise<{ changes: WorkflowChangeWithUser[]; total: number }> {
    const where: any = { workflowId };

    if (options?.since) {
      where.createdAt = { gte: options.since };
    }

    if (options?.changeTypes && options.changeTypes.length > 0) {
      where.changeType = { in: options.changeTypes };
    }

    const [changes, total] = await Promise.all([
      this.prisma.workflowChange.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.workflowChange.count({ where }),
    ]);

    return { changes, total };
  }

  /**
   * Get changes for a specific node
   */
  async getNodeChanges(
    workflowId: string,
    nodeId: string,
    limit: number = 20,
  ): Promise<WorkflowChangeWithUser[]> {
    return this.prisma.workflowChange.findMany({
      where: {
        workflowId,
        nodeId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get changes by a specific user
   */
  async getUserChanges(
    workflowId: string,
    userId: string,
    limit: number = 20,
  ): Promise<WorkflowChangeWithUser[]> {
    return this.prisma.workflowChange.findMany({
      where: {
        workflowId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get change statistics for a workflow
   */
  async getChangeStats(workflowId: string): Promise<{
    totalChanges: number;
    changesByType: Record<string, number>;
    changesByUser: { userId: string; userName: string; count: number }[];
    recentActivity: { date: string; count: number }[];
  }> {
    const [totalChanges, changesByType, changesByUser, recentChanges] = await Promise.all([
      this.prisma.workflowChange.count({ where: { workflowId } }),
      this.prisma.workflowChange.groupBy({
        by: ['changeType'],
        where: { workflowId },
        _count: true,
      }),
      this.prisma.workflowChange.groupBy({
        by: ['userId'],
        where: { workflowId },
        _count: true,
      }),
      this.prisma.workflowChange.findMany({
        where: {
          workflowId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Get user names for the user stats
    const userIds = changesByUser.map(c => c.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u.name || u.email.split('@')[0]]));

    // Group recent changes by date
    const activityByDate = new Map<string, number>();
    for (const change of recentChanges) {
      const date = change.createdAt.toISOString().split('T')[0];
      activityByDate.set(date, (activityByDate.get(date) || 0) + 1);
    }

    return {
      totalChanges,
      changesByType: Object.fromEntries(
        changesByType.map(c => [c.changeType, c._count]),
      ),
      changesByUser: changesByUser.map(c => ({
        userId: c.userId,
        userName: userMap.get(c.userId) || 'Unknown',
        count: c._count,
      })),
      recentActivity: Array.from(activityByDate.entries()).map(([date, count]) => ({
        date,
        count,
      })),
    };
  }

  /**
   * Cleanup old changes (for maintenance)
   */
  async cleanupOldChanges(olderThan: Date): Promise<number> {
    const result = await this.prisma.workflowChange.deleteMany({
      where: {
        createdAt: { lt: olderThan },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old changes`);
    return result.count;
  }

  /**
   * Generate a human-readable description for a change
   */
  private generateDescription(
    changeType: ChangeType,
    options?: {
      nodeId?: string;
      edgeId?: string;
      newData?: Record<string, unknown>;
    },
  ): string {
    const nodeLabel = options?.newData?.['label'] || options?.nodeId || 'node';
    const edgeLabel = options?.edgeId || 'edge';

    switch (changeType) {
      case 'NODE_ADDED':
        return `Added node "${nodeLabel}"`;
      case 'NODE_UPDATED':
        return `Updated node "${nodeLabel}"`;
      case 'NODE_DELETED':
        return `Deleted node "${nodeLabel}"`;
      case 'NODE_MOVED':
        return `Moved node "${nodeLabel}"`;
      case 'EDGE_ADDED':
        return `Added connection ${edgeLabel}`;
      case 'EDGE_DELETED':
        return `Removed connection ${edgeLabel}`;
      case 'CONFIG_CHANGED':
        return `Updated node configuration`;
      case 'SETTINGS_CHANGED':
        return `Updated workflow settings`;
      default:
        return `Made changes`;
    }
  }
}
