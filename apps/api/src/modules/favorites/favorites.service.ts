import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface WorkflowWithFavorite {
  id: string;
  name: string;
  description: string | null;
  status: string;
  isActive: boolean;
  updatedAt: Date;
  team: {
    id: string;
    name: string;
  };
  isFavorite: boolean;
}

export interface RecentWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  updatedAt: Date;
  accessedAt: Date;
  team: {
    id: string;
    name: string;
  };
}

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add a workflow to favorites
   */
  async addFavorite(userId: string, workflowId: string): Promise<void> {
    // Verify workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.prisma.workflowFavorite.upsert({
      where: {
        userId_workflowId: { userId, workflowId },
      },
      create: { userId, workflowId },
      update: {},
    });

    this.logger.log(`User ${userId} added workflow ${workflowId} to favorites`);
  }

  /**
   * Remove a workflow from favorites
   */
  async removeFavorite(userId: string, workflowId: string): Promise<void> {
    await this.prisma.workflowFavorite.deleteMany({
      where: { userId, workflowId },
    });

    this.logger.log(`User ${userId} removed workflow ${workflowId} from favorites`);
  }

  /**
   * Check if a workflow is favorited
   */
  async isFavorite(userId: string, workflowId: string): Promise<boolean> {
    const favorite = await this.prisma.workflowFavorite.findUnique({
      where: {
        userId_workflowId: { userId, workflowId },
      },
    });

    return !!favorite;
  }

  /**
   * Get user's favorite workflows
   */
  async getFavorites(
    userId: string,
    teamIds: string[],
    options?: { limit?: number; offset?: number },
  ): Promise<{ workflows: WorkflowWithFavorite[]; total: number }> {
    const where = {
      userId,
      workflow: {
        teamId: { in: teamIds },
      },
    };

    const [favorites, total] = await Promise.all([
      this.prisma.workflowFavorite.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          workflow: {
            include: {
              team: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.workflowFavorite.count({ where }),
    ]);

    return {
      workflows: favorites.map((f) => ({
        id: f.workflow.id,
        name: f.workflow.name,
        description: f.workflow.description,
        status: f.workflow.status,
        isActive: f.workflow.isActive,
        updatedAt: f.workflow.updatedAt,
        team: f.workflow.team,
        isFavorite: true,
      })),
      total,
    };
  }

  /**
   * Record a workflow access
   */
  async recordAccess(userId: string, workflowId: string): Promise<void> {
    // Upsert to update access time if already exists
    await this.prisma.workflowAccess.upsert({
      where: {
        // Since there's no unique constraint on userId+workflowId for access,
        // we need to use a different approach - delete old and create new
        id: '', // This won't match, forcing create
      },
      create: {
        userId,
        workflowId,
        accessedAt: new Date(),
      },
      update: {
        accessedAt: new Date(),
      },
    }).catch(async () => {
      // If upsert fails, just create a new record
      await this.prisma.workflowAccess.create({
        data: {
          userId,
          workflowId,
          accessedAt: new Date(),
        },
      });
    });

    // Clean up old access records (keep last 50)
    const accessCount = await this.prisma.workflowAccess.count({
      where: { userId },
    });

    if (accessCount > 50) {
      const oldAccesses = await this.prisma.workflowAccess.findMany({
        where: { userId },
        orderBy: { accessedAt: 'asc' },
        take: accessCount - 50,
        select: { id: true },
      });

      await this.prisma.workflowAccess.deleteMany({
        where: {
          id: { in: oldAccesses.map((a) => a.id) },
        },
      });
    }
  }

  /**
   * Get user's recent workflows
   */
  async getRecentWorkflows(
    userId: string,
    teamIds: string[],
    options?: { limit?: number; offset?: number },
  ): Promise<{ workflows: RecentWorkflow[]; total: number }> {
    // Get unique recent workflows (deduplicated by workflowId)
    const recentAccesses = await this.prisma.workflowAccess.findMany({
      where: {
        userId,
        workflow: {
          teamId: { in: teamIds },
        },
      },
      orderBy: { accessedAt: 'desc' },
      include: {
        workflow: {
          include: {
            team: { select: { id: true, name: true } },
          },
        },
      },
      take: 100, // Get more than needed to dedupe
    });

    // Deduplicate by workflowId (keep most recent)
    const seen = new Set<string>();
    const uniqueAccesses = recentAccesses.filter((a) => {
      if (seen.has(a.workflowId)) return false;
      seen.add(a.workflowId);
      return true;
    });

    const total = uniqueAccesses.length;
    const paginated = uniqueAccesses.slice(
      options?.offset || 0,
      (options?.offset || 0) + (options?.limit || 10),
    );

    return {
      workflows: paginated.map((a) => ({
        id: a.workflow.id,
        name: a.workflow.name,
        description: a.workflow.description,
        status: a.workflow.status,
        updatedAt: a.workflow.updatedAt,
        accessedAt: a.accessedAt,
        team: a.workflow.team,
      })),
      total,
    };
  }

  /**
   * Toggle favorite status
   */
  async toggleFavorite(userId: string, workflowId: string): Promise<boolean> {
    const isFav = await this.isFavorite(userId, workflowId);

    if (isFav) {
      await this.removeFavorite(userId, workflowId);
      return false;
    } else {
      await this.addFavorite(userId, workflowId);
      return true;
    }
  }

  /**
   * Get favorite IDs for a list of workflows (for batch checking)
   */
  async getFavoriteIds(userId: string, workflowIds: string[]): Promise<Set<string>> {
    const favorites = await this.prisma.workflowFavorite.findMany({
      where: {
        userId,
        workflowId: { in: workflowIds },
      },
      select: { workflowId: true },
    });

    return new Set(favorites.map((f) => f.workflowId));
  }
}
