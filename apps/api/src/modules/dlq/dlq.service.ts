import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { DLQStatus, Prisma } from '@prisma/client';

interface DLQEntry {
  executionId: string;
  workflowId: string;
  teamId: string;
  nodeId?: string;
  nodeName?: string;
  errorMessage: string;
  errorStack?: string;
  inputData?: Record<string, any>;
  maxRetries?: number;
}

@Injectable()
export class DeadLetterQueueService {
  private readonly logger = new Logger(DeadLetterQueueService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Add a failed execution to the dead letter queue
   */
  async addToQueue(entry: DLQEntry): Promise<void> {
    const dlqEntry = await this.prisma.deadLetterQueue.create({
      data: {
        executionId: entry.executionId,
        workflowId: entry.workflowId,
        teamId: entry.teamId,
        nodeId: entry.nodeId,
        nodeName: entry.nodeName,
        errorMessage: entry.errorMessage,
        errorStack: entry.errorStack,
        inputData: entry.inputData as any,
        maxRetries: entry.maxRetries || 3,
        status: 'PENDING',
      },
    });

    // Publish event for real-time notifications
    await this.redis.publish('dlq:new', JSON.stringify(dlqEntry));

    this.logger.log(
      `Added execution ${entry.executionId} to DLQ for workflow ${entry.workflowId}`,
    );
  }

  /**
   * Get DLQ entries for a team
   */
  async getEntries(
    teamId: string,
    options?: {
      status?: DLQStatus;
      workflowId?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.DeadLetterQueueWhereInput = { teamId };

    if (options?.status) {
      where.status = options.status;
    }
    if (options?.workflowId) {
      where.workflowId = options.workflowId;
    }

    const [data, total] = await Promise.all([
      this.prisma.deadLetterQueue.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 50,
        include: {
          workflow: {
            select: { name: true },
          },
          execution: {
            select: { status: true, startedAt: true },
          },
        },
      }),
      this.prisma.deadLetterQueue.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Retry a DLQ entry
   */
  async retryEntry(entryId: string): Promise<{ success: boolean; message: string }> {
    const entry = await this.prisma.deadLetterQueue.findUnique({
      where: { id: entryId },
      include: {
        workflow: true,
        execution: true,
      },
    });

    if (!entry) {
      return { success: false, message: 'DLQ entry not found' };
    }

    if (entry.status === 'RESOLVED') {
      return { success: false, message: 'Entry already resolved' };
    }

    if (entry.retryCount >= entry.maxRetries) {
      await this.prisma.deadLetterQueue.update({
        where: { id: entryId },
        data: { status: 'DISCARDED' },
      });
      return { success: false, message: 'Max retries exceeded' };
    }

    // Update retry count and status
    await this.prisma.deadLetterQueue.update({
      where: { id: entryId },
      data: {
        retryCount: { increment: 1 },
        status: 'RETRYING',
        lastRetryAt: new Date(),
      },
    });

    // Queue for retry execution
    const retryPayload = {
      executionId: entry.executionId,
      workflowId: entry.workflowId,
      teamId: entry.teamId,
      inputData: entry.inputData,
      isRetry: true,
      dlqEntryId: entryId,
    };

    await this.redis.rpush(
      'workflow:executions:retry',
      JSON.stringify(retryPayload),
    );

    this.logger.log(`Queued DLQ entry ${entryId} for retry (attempt ${entry.retryCount + 1})`);

    return { success: true, message: 'Entry queued for retry' };
  }

  /**
   * Retry all pending entries for a workflow
   */
  async retryAllForWorkflow(
    teamId: string,
    workflowId: string,
  ): Promise<{ retried: number; skipped: number }> {
    const entries = await this.prisma.deadLetterQueue.findMany({
      where: {
        teamId,
        workflowId,
        status: 'PENDING',
      },
    });

    let retried = 0;
    let skipped = 0;

    for (const entry of entries) {
      const result = await this.retryEntry(entry.id);
      if (result.success) {
        retried++;
      } else {
        skipped++;
      }
    }

    return { retried, skipped };
  }

  /**
   * Mark entry as resolved (manually fixed)
   */
  async markResolved(entryId: string, resolvedBy: string): Promise<void> {
    await this.prisma.deadLetterQueue.update({
      where: { id: entryId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy,
      },
    });

    this.logger.log(`DLQ entry ${entryId} marked as resolved by ${resolvedBy}`);
  }

  /**
   * Discard an entry (won't retry)
   */
  async discardEntry(entryId: string): Promise<void> {
    await this.prisma.deadLetterQueue.update({
      where: { id: entryId },
      data: { status: 'DISCARDED' },
    });

    this.logger.log(`DLQ entry ${entryId} discarded`);
  }

  /**
   * Update DLQ entry status after retry attempt
   */
  async updateAfterRetry(
    dlqEntryId: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    if (success) {
      await this.prisma.deadLetterQueue.update({
        where: { id: dlqEntryId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
        },
      });
      this.logger.log(`DLQ entry ${dlqEntryId} resolved after retry`);
    } else {
      const entry = await this.prisma.deadLetterQueue.findUnique({
        where: { id: dlqEntryId },
      });

      if (entry && entry.retryCount >= entry.maxRetries) {
        await this.prisma.deadLetterQueue.update({
          where: { id: dlqEntryId },
          data: {
            status: 'DISCARDED',
            errorMessage: errorMessage || entry.errorMessage,
          },
        });
        this.logger.log(`DLQ entry ${dlqEntryId} discarded after max retries`);
      } else {
        await this.prisma.deadLetterQueue.update({
          where: { id: dlqEntryId },
          data: {
            status: 'PENDING',
            errorMessage: errorMessage || entry?.errorMessage,
          },
        });
      }
    }
  }

  /**
   * Get DLQ statistics for a team
   */
  async getStats(teamId: string) {
    const [pending, retrying, resolved, discarded] = await Promise.all([
      this.prisma.deadLetterQueue.count({
        where: { teamId, status: 'PENDING' },
      }),
      this.prisma.deadLetterQueue.count({
        where: { teamId, status: 'RETRYING' },
      }),
      this.prisma.deadLetterQueue.count({
        where: { teamId, status: 'RESOLVED' },
      }),
      this.prisma.deadLetterQueue.count({
        where: { teamId, status: 'DISCARDED' },
      }),
    ]);

    // Get entries by workflow
    const byWorkflow = await this.prisma.deadLetterQueue.groupBy({
      by: ['workflowId'],
      where: { teamId, status: 'PENDING' },
      _count: { id: true },
    });

    return {
      pending,
      retrying,
      resolved,
      discarded,
      total: pending + retrying + resolved + discarded,
      byWorkflow,
    };
  }

  /**
   * Cleanup old resolved/discarded entries
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.deadLetterQueue.deleteMany({
      where: {
        status: { in: ['RESOLVED', 'DISCARDED'] },
        createdAt: { lt: cutoff },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old DLQ entries`);
    return result.count;
  }
}
