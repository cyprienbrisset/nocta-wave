import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction, ResourceType, Prisma } from '@prisma/client';

export interface AuditLogContext {
  userId?: string;
  teamId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogEntry {
  action: AuditAction;
  resourceType: ResourceType;
  resourceId: string;
  resourceName?: string;
  details?: Record<string, any>;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log an audit event
   */
  async log(context: AuditLogContext, entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          teamId: context.teamId,
          userId: context.userId,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          resourceName: entry.resourceName,
          details: entry.details as Prisma.JsonObject,
        },
      });

      this.logger.debug(
        `Audit: ${entry.action} on ${entry.resourceType}:${entry.resourceId} by user ${context.userId}`,
      );
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      this.logger.error('Failed to create audit log', error);
    }
  }

  /**
   * Log credential access
   */
  async logCredentialAccess(
    context: AuditLogContext,
    credentialId: string,
    credentialName: string,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'USE',
    details?: Record<string, any>,
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      CREATE: 'CREDENTIAL_CREATE',
      READ: 'CREDENTIAL_READ',
      UPDATE: 'CREDENTIAL_UPDATE',
      DELETE: 'CREDENTIAL_DELETE',
      USE: 'CREDENTIAL_USE',
    };

    await this.log(context, {
      action: actionMap[action] as AuditAction,
      resourceType: 'CREDENTIAL',
      resourceId: credentialId,
      resourceName: credentialName,
      details,
    });
  }

  /**
   * Log workflow action
   */
  async logWorkflowAction(
    context: AuditLogContext,
    workflowId: string,
    workflowName: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ACTIVATE' | 'DEACTIVATE' | 'EXECUTE',
    details?: Record<string, any>,
  ): Promise<void> {
    const actionMap: Record<string, AuditAction> = {
      CREATE: 'WORKFLOW_CREATE',
      UPDATE: 'WORKFLOW_UPDATE',
      DELETE: 'WORKFLOW_DELETE',
      ACTIVATE: 'WORKFLOW_ACTIVATE',
      DEACTIVATE: 'WORKFLOW_DEACTIVATE',
      EXECUTE: 'WORKFLOW_EXECUTE',
    };

    await this.log(context, {
      action: actionMap[action] as AuditAction,
      resourceType: 'WORKFLOW',
      resourceId: workflowId,
      resourceName: workflowName,
      details,
    });
  }

  /**
   * Get audit logs for a team
   */
  async getAuditLogs(
    teamId: string,
    options?: {
      resourceType?: ResourceType;
      resourceId?: string;
      action?: AuditAction;
      userId?: string;
      startDate?: Date;
      endDate?: Date;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.AuditLogWhereInput = {
      teamId,
    };

    if (options?.resourceType) {
      where.resourceType = options.resourceType;
    }
    if (options?.resourceId) {
      where.resourceId = options.resourceId;
    }
    if (options?.action) {
      where.action = options.action;
    }
    if (options?.userId) {
      where.userId = options.userId;
    }
    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options?.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options?.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get credential access history
   */
  async getCredentialAccessHistory(
    teamId: string,
    credentialId: string,
    options?: { skip?: number; take?: number },
  ) {
    return this.getAuditLogs(teamId, {
      resourceType: 'CREDENTIAL',
      resourceId: credentialId,
      ...options,
    });
  }

  /**
   * Get user activity
   */
  async getUserActivity(
    teamId: string,
    userId: string,
    options?: { startDate?: Date; endDate?: Date; skip?: number; take?: number },
  ) {
    return this.getAuditLogs(teamId, {
      userId,
      ...options,
    });
  }

  /**
   * Clean up old audit logs (retention policy)
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} audit logs older than ${retentionDays} days`);
    return result.count;
  }
}
