import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { TeamService } from '../team/team.service';
import { WorkflowService } from '../workflow/workflow.service';
import { ExecutionLogStorageService } from '../storage/execution-log-storage.service';
import { ExecutionStatus, TriggerType } from '@prisma/client';
import { ExecutionQueryDto } from './dto/execution.dto';

@Injectable()
export class ExecutionService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private teamService: TeamService,
    private workflowService: WorkflowService,
    private logStorage: ExecutionLogStorageService,
  ) {}

  /**
   * Trigger a workflow execution
   */
  async trigger(
    workflowId: string,
    userId: string,
    triggerType: TriggerType = 'MANUAL',
    inputData?: Record<string, any>,
  ) {
    const workflow = await this.workflowService.findById(workflowId, userId);

    if (!workflow.isActive && triggerType !== 'MANUAL') {
      throw new BadRequestException('Workflow is not active');
    }

    // Create execution record
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        triggeredBy: userId,
        triggerType,
        status: 'PENDING',
        inputData: inputData || {},
      },
    });

    // Queue the execution job
    await this.redis.lpush('workflow:executions', {
      executionId: execution.id,
      workflowId,
      teamId: workflow.teamId,
      graph: workflow.graph,
      inputData,
      settings: workflow.settings,
    });

    // Publish event for real-time updates
    await this.redis.publish('execution:started', {
      executionId: execution.id,
      workflowId,
      teamId: workflow.teamId,
    });

    return execution;
  }

  /**
   * Get execution by ID
   */
  async findById(id: string, userId?: string) {
    const execution = await this.prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            teamId: true,
          },
        },
        nodeLogs: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    // Verify access
    if (userId) {
      await this.teamService.checkTeamAccess(
        execution.workflow.teamId,
        userId,
        ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
      );
    }

    return execution;
  }

  /**
   * Get execution log with full data (hydrated from object storage if needed)
   */
  async getLogWithFullData(logId: string, userId?: string) {
    const log = await this.prisma.executionLog.findUnique({
      where: { id: logId },
      include: {
        execution: {
          include: {
            workflow: {
              select: { teamId: true },
            },
          },
        },
      },
    });

    if (!log) {
      throw new NotFoundException('Execution log not found');
    }

    // Verify access
    if (userId) {
      await this.teamService.checkTeamAccess(
        log.execution.workflow.teamId,
        userId,
        ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'],
      );
    }

    // Hydrate data from object storage if externalized
    const fullData = await this.logStorage.getFullLogData({
      inputData: log.inputData,
      outputData: log.outputData,
      inputDataRef: log.inputDataRef,
      outputDataRef: log.outputDataRef,
    });

    return {
      ...log,
      inputData: fullData.inputData,
      outputData: fullData.outputData,
      // Indicate if data was hydrated from external storage
      _dataHydrated: !!(log.inputDataRef || log.outputDataRef),
    };
  }

  /**
   * Check if log data is externalized
   */
  isLogDataExternalized(log: { inputDataRef?: unknown; outputDataRef?: unknown }): boolean {
    return !!(log.inputDataRef || log.outputDataRef);
  }

  /**
   * List executions for a workflow
   */
  async findByWorkflow(
    workflowId: string,
    userId: string,
    query: ExecutionQueryDto,
  ) {
    const workflow = await this.workflowService.findById(workflowId, userId);

    const where: any = { workflowId };

    if (query.status) {
      where.status = query.status;
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip || 0,
        take: query.take || 20,
      }),
      this.prisma.execution.count({ where }),
    ]);

    return {
      data: executions,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 20)) + 1,
      pageSize: query.take || 20,
    };
  }

  /**
   * List executions for a team
   */
  async findByTeam(teamId: string, userId: string, query: ExecutionQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    const where: any = {
      workflow: { teamId },
    };

    if (query.status) {
      where.status = query.status;
    }

    const [executions, total] = await Promise.all([
      this.prisma.execution.findMany({
        where,
        include: {
          workflow: {
            select: {
              id: true,
              name: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: query.skip || 0,
        take: query.take || 20,
      }),
      this.prisma.execution.count({ where }),
    ]);

    return {
      data: executions,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 20)) + 1,
      pageSize: query.take || 20,
    };
  }

  /**
   * Cancel a running execution
   */
  async cancel(id: string, userId: string) {
    const execution = await this.findById(id, userId);

    if (!['PENDING', 'QUEUED', 'RUNNING'].includes(execution.status)) {
      throw new BadRequestException('Execution cannot be cancelled');
    }

    await this.prisma.execution.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
      },
    });

    // Publish cancel event
    await this.redis.publish('execution:cancelled', {
      executionId: id,
    });

    return { message: 'Execution cancelled' };
  }

  /**
   * Retry a failed execution
   */
  async retry(id: string, userId: string) {
    const execution = await this.findById(id, userId);

    if (execution.status !== 'FAILED') {
      throw new BadRequestException('Only failed executions can be retried');
    }

    return this.trigger(
      execution.workflowId,
      userId,
      'MANUAL',
      execution.inputData as Record<string, any>,
    );
  }

  /**
   * Get execution statistics
   */
  async getStats(teamId: string, userId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    const [total, completed, failed, running] = await Promise.all([
      this.prisma.execution.count({
        where: { workflow: { teamId } },
      }),
      this.prisma.execution.count({
        where: { workflow: { teamId }, status: 'COMPLETED' },
      }),
      this.prisma.execution.count({
        where: { workflow: { teamId }, status: 'FAILED' },
      }),
      this.prisma.execution.count({
        where: { workflow: { teamId }, status: 'RUNNING' },
      }),
    ]);

    // Get recent executions count by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentExecutions = await this.prisma.execution.groupBy({
      by: ['status'],
      where: {
        workflow: { teamId },
        createdAt: { gte: sevenDaysAgo },
      },
      _count: true,
    });

    return {
      total,
      completed,
      failed,
      running,
      successRate: total > 0 ? ((completed / total) * 100).toFixed(1) : '0',
      recentExecutions,
    };
  }

  /**
   * Update execution status (called by worker)
   */
  async updateStatus(
    id: string,
    status: ExecutionStatus,
    data?: {
      errorMessage?: string;
      outputData?: Record<string, any>;
      duration?: number;
    },
  ) {
    const updateData: any = { status };

    if (status === 'RUNNING') {
      updateData.startedAt = new Date();
    }

    if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'].includes(status)) {
      updateData.finishedAt = new Date();
    }

    if (data?.errorMessage) {
      updateData.errorMessage = data.errorMessage;
    }

    if (data?.outputData) {
      updateData.outputData = data.outputData;
    }

    if (data?.duration) {
      updateData.duration = data.duration;
    }

    return this.prisma.execution.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Trigger a workflow execution as a guest
   */
  async triggerAsGuest(
    workflowId: string,
    guestName: string,
    guestSessionId: string,
    inputData?: Record<string, any>,
  ) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: true },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Create execution record with guest info
    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        triggerType: 'MANUAL',
        status: 'PENDING',
        inputData: {
          ...inputData,
          _guestContext: {
            guestName,
            guestSessionId,
          },
        },
      },
    });

    // Queue the execution job
    await this.redis.lpush('workflow:executions', {
      executionId: execution.id,
      workflowId,
      teamId: workflow.teamId,
      graph: workflow.graph,
      inputData,
      settings: workflow.settings,
    });

    // Publish event for real-time updates
    await this.redis.publish('execution:started', {
      executionId: execution.id,
      workflowId,
      teamId: workflow.teamId,
    });

    return execution;
  }

  /**
   * List executions for a workflow without user auth check (for guests)
   */
  async findByWorkflowPublic(
    workflowId: string,
    options: { limit?: number } = {},
  ) {
    const executions = await this.prisma.execution.findMany({
      where: { workflowId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        nodeLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 10,
    });

    return { data: executions };
  }
}
