import { schedules, logger } from '@trigger.dev/sdk/v3';
import { db } from '../services/database.service';
import { executeWorkflowTask } from './workflow-executor';

/**
 * Cron scheduler that runs every minute to check for pending schedules
 */
export const cronScheduler = schedules.task({
  id: 'cron-scheduler',
  cron: '* * * * *', // Every minute
  run: async () => {
    logger.info('Checking for pending schedules');

    const pendingSchedules = await db.getPendingSchedules();

    logger.info(`Found ${pendingSchedules.length} pending schedules`);

    for (const schedule of pendingSchedules) {
      if (!schedule.workflow.isActive) {
        logger.debug(`Skipping inactive workflow: ${schedule.workflowId}`);
        continue;
      }

      logger.info(`Triggering scheduled workflow: ${schedule.workflowId}`, {
        scheduleId: schedule.id,
        cron: schedule.cron,
      });

      try {
        // Trigger workflow execution
        await executeWorkflowTask.trigger({
          executionId: `sched-${schedule.id}-${Date.now()}`,
          workflowId: schedule.workflowId,
          teamId: schedule.workflow.teamId,
          graph: schedule.workflow.graph as any,
          inputData: {
            triggerType: 'schedule',
            scheduleId: schedule.id,
            scheduledAt: new Date().toISOString(),
          },
        });

        // Calculate next run time
        const nextRunAt = getNextCronTime(schedule.cron, schedule.timezone);

        // Update schedule
        await db.updateScheduleRun(schedule.id, new Date(), nextRunAt);
      } catch (error) {
        logger.error(`Failed to trigger scheduled workflow: ${schedule.workflowId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { processed: pendingSchedules.length };
  },
});

/**
 * Calculate next cron run time
 */
function getNextCronTime(cron: string, timezone: string): Date {
  // Simple implementation - for production, use a proper cron parser like 'cron-parser'
  // This is a placeholder that schedules for the next minute
  const next = new Date();
  next.setMinutes(next.getMinutes() + 1);
  next.setSeconds(0);
  next.setMilliseconds(0);
  return next;
}
