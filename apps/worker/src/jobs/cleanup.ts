import { schedules, logger } from '@trigger.dev/sdk/v3';
import { prisma } from '../services/database.service';

/**
 * Cleanup job that runs daily to remove old data
 */
export const cleanupJob = schedules.task({
  id: 'cleanup-old-data',
  cron: '0 2 * * *', // Daily at 2 AM
  run: async () => {
    logger.info('Starting cleanup job');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Delete old execution logs (30 days)
    const deletedLogs = await prisma.executionLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    logger.info(`Deleted ${deletedLogs.count} old execution logs`);

    // Delete old executions (90 days)
    const deletedExecutions = await prisma.execution.deleteMany({
      where: {
        createdAt: {
          lt: ninetyDaysAgo,
        },
      },
    });

    logger.info(`Deleted ${deletedExecutions.count} old executions`);

    // Delete expired refresh tokens
    const deletedTokens = await prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Deleted ${deletedTokens.count} expired refresh tokens`);

    // Delete old workflow versions (keep last 10 per workflow)
    const workflows = await prisma.workflow.findMany({
      select: { id: true },
    });

    let deletedVersions = 0;
    for (const workflow of workflows) {
      const versionsToKeep = await prisma.workflowVersion.findMany({
        where: { workflowId: workflow.id },
        orderBy: { version: 'desc' },
        take: 10,
        select: { id: true },
      });

      const keepIds = versionsToKeep.map((v) => v.id);

      const deleted = await prisma.workflowVersion.deleteMany({
        where: {
          workflowId: workflow.id,
          id: { notIn: keepIds },
        },
      });

      deletedVersions += deleted.count;
    }

    logger.info(`Deleted ${deletedVersions} old workflow versions`);

    return {
      deletedLogs: deletedLogs.count,
      deletedExecutions: deletedExecutions.count,
      deletedTokens: deletedTokens.count,
      deletedVersions,
    };
  },
});
