import { PrismaClient, ExecutionStatus, NodeLogStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const db = {
  /**
   * Get execution by ID
   */
  async getExecution(id: string) {
    return prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: true,
      },
    });
  },

  /**
   * Update execution status
   */
  async updateExecutionStatus(
    id: string,
    status: ExecutionStatus,
    data?: {
      errorMessage?: string;
      outputData?: Record<string, any>;
      duration?: number;
      startedAt?: Date;
      finishedAt?: Date;
    },
  ) {
    return prisma.execution.update({
      where: { id },
      data: {
        status,
        ...data,
      },
    });
  },

  /**
   * Create node execution log
   */
  async createNodeLog(data: {
    executionId: string;
    nodeId: string;
    nodeType: string;
    nodeName?: string;
    status: NodeLogStatus;
    inputData?: any;
  }) {
    return prisma.executionLog.create({
      data,
    });
  },

  /**
   * Update node execution log
   */
  async updateNodeLog(
    id: string,
    data: {
      status?: NodeLogStatus;
      outputData?: any;
      error?: string;
      startedAt?: Date;
      finishedAt?: Date;
      duration?: number;
      retryCount?: number;
    },
  ) {
    return prisma.executionLog.update({
      where: { id },
      data,
    });
  },

  /**
   * Get credentials for workflow
   */
  async getCredentials(teamId: string, credentialIds: string[]) {
    return prisma.credential.findMany({
      where: {
        teamId,
        id: { in: credentialIds },
      },
    });
  },

  /**
   * Get workflow by ID
   */
  async getWorkflow(id: string) {
    return prisma.workflow.findUnique({
      where: { id },
    });
  },

  /**
   * Get pending schedules
   */
  async getPendingSchedules() {
    return prisma.schedule.findMany({
      where: {
        isActive: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
      include: {
        workflow: true,
      },
    });
  },

  /**
   * Update schedule last run
   */
  async updateScheduleRun(id: string, lastRunAt: Date, nextRunAt: Date) {
    return prisma.schedule.update({
      where: { id },
      data: {
        lastRunAt,
        nextRunAt,
      },
    });
  },
};

export { prisma };
