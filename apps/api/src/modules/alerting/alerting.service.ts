import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import {
  AlertCondition,
  AlertChannelType,
  AlertSeverity,
  Prisma,
} from '@prisma/client';

interface AlertContext {
  teamId: string;
  workflowId?: string;
  workflowName?: string;
  executionId?: string;
  nodeId?: string;
  nodeName?: string;
  errorMessage?: string;
}

interface AlertRuleWithChannels {
  id: string;
  teamId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  condition: AlertCondition;
  threshold: number | null;
  workflowId: string | null;
  cooldownMs: number;
  lastFiredAt: Date | null;
  channels: Array<{
    id: string;
    type: AlertChannelType;
    config: any;
    isActive: boolean;
  }>;
}

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  /**
   * Check and fire alerts for an execution failure
   */
  async checkExecutionFailure(context: AlertContext): Promise<void> {
    const rules = await this.getMatchingRules(
      context.teamId,
      context.workflowId,
      ['EXECUTION_FAILED', 'CONSECUTIVE_FAILURES', 'ERROR_RATE_THRESHOLD'],
    );

    for (const rule of rules) {
      const shouldFire = await this.shouldFireAlert(rule, context);
      if (shouldFire) {
        await this.fireAlert(rule, context, 'ERROR');
      }
    }
  }

  /**
   * Check and fire alerts for execution timeout
   */
  async checkExecutionTimeout(context: AlertContext): Promise<void> {
    const rules = await this.getMatchingRules(
      context.teamId,
      context.workflowId,
      ['EXECUTION_TIMEOUT'],
    );

    for (const rule of rules) {
      const shouldFire = await this.shouldFireAlert(rule, context);
      if (shouldFire) {
        await this.fireAlert(rule, context, 'WARNING');
      }
    }
  }

  /**
   * Check and fire alerts for circuit breaker opening
   */
  async checkCircuitBreakerOpen(
    teamId: string,
    nodeType: string,
    failureCount: number,
  ): Promise<void> {
    const rules = await this.getMatchingRules(teamId, undefined, [
      'CIRCUIT_BREAKER_OPEN',
    ]);

    for (const rule of rules) {
      const context: AlertContext = {
        teamId,
        nodeName: nodeType,
        errorMessage: `Circuit breaker opened after ${failureCount} failures`,
      };
      await this.fireAlert(rule, context, 'CRITICAL');
    }
  }

  /**
   * Check queue depth alert
   */
  async checkQueueDepth(teamId: string): Promise<void> {
    const rules = await this.getMatchingRules(teamId, undefined, ['QUEUE_DEPTH']);

    for (const rule of rules) {
      if (rule.threshold) {
        const queueLength = await this.redis.llen('workflow:executions');
        const priorityQueueLength = await this.redis.llen('workflow:executions:priority');
        const totalQueue = queueLength + priorityQueueLength;

        if (totalQueue >= rule.threshold) {
          const context: AlertContext = {
            teamId,
            errorMessage: `Queue depth ${totalQueue} exceeds threshold ${rule.threshold}`,
          };
          await this.fireAlert(rule, context, 'WARNING');
        }
      }
    }
  }

  /**
   * Get matching alert rules
   */
  private async getMatchingRules(
    teamId: string,
    workflowId?: string,
    conditions?: AlertCondition[],
  ): Promise<AlertRuleWithChannels[]> {
    const where: Prisma.AlertRuleWhereInput = {
      teamId,
      isActive: true,
    };

    if (conditions && conditions.length > 0) {
      where.condition = { in: conditions };
    }

    // Match rules for specific workflow or all workflows (workflowId = null)
    if (workflowId) {
      where.OR = [{ workflowId }, { workflowId: null }];
    }

    return this.prisma.alertRule.findMany({
      where,
      include: {
        channels: {
          where: { isActive: true },
        },
      },
    });
  }

  /**
   * Check if alert should fire (cooldown, threshold, etc.)
   */
  private async shouldFireAlert(
    rule: AlertRuleWithChannels,
    context: AlertContext,
  ): Promise<boolean> {
    // Check cooldown
    if (rule.lastFiredAt) {
      const timeSinceLastFire = Date.now() - rule.lastFiredAt.getTime();
      if (timeSinceLastFire < rule.cooldownMs) {
        return false;
      }
    }

    // Check condition-specific logic
    switch (rule.condition) {
      case 'CONSECUTIVE_FAILURES':
        if (rule.threshold && context.workflowId) {
          const consecutiveFailures = await this.getConsecutiveFailures(
            context.workflowId,
          );
          return consecutiveFailures >= rule.threshold;
        }
        return true;

      case 'ERROR_RATE_THRESHOLD':
        if (rule.threshold && context.workflowId) {
          const errorRate = await this.getErrorRate(context.workflowId);
          return errorRate >= rule.threshold;
        }
        return true;

      default:
        return true;
    }
  }

  /**
   * Get consecutive failure count for a workflow
   */
  private async getConsecutiveFailures(workflowId: string): Promise<number> {
    const recentExecutions = await this.prisma.execution.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { status: true },
    });

    let count = 0;
    for (const exec of recentExecutions) {
      if (exec.status === 'FAILED') {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  /**
   * Get error rate for a workflow (last 24 hours)
   */
  private async getErrorRate(workflowId: string): Promise<number> {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const [total, failed] = await Promise.all([
      this.prisma.execution.count({
        where: {
          workflowId,
          createdAt: { gte: since },
        },
      }),
      this.prisma.execution.count({
        where: {
          workflowId,
          createdAt: { gte: since },
          status: 'FAILED',
        },
      }),
    ]);

    return total > 0 ? (failed / total) * 100 : 0;
  }

  /**
   * Fire an alert
   */
  private async fireAlert(
    rule: AlertRuleWithChannels,
    context: AlertContext,
    severity: AlertSeverity,
  ): Promise<void> {
    const message = this.buildAlertMessage(rule, context);
    const sentTo: string[] = [];

    // Send to each channel
    for (const channel of rule.channels) {
      try {
        await this.sendToChannel(channel, message, severity, context);
        sentTo.push(channel.type);
      } catch (error) {
        this.logger.error(
          `Failed to send alert to ${channel.type}: ${error}`,
        );
      }
    }

    // Update last fired timestamp
    await this.prisma.alertRule.update({
      where: { id: rule.id },
      data: { lastFiredAt: new Date() },
    });

    // Record alert history
    await this.prisma.alertHistory.create({
      data: {
        alertRuleId: rule.id,
        executionId: context.executionId,
        workflowId: context.workflowId,
        message,
        severity,
        sentTo: sentTo as any,
      },
    });

    this.logger.log(
      `Alert fired: ${rule.name} for ${context.workflowId || 'team'} -> ${sentTo.join(', ')}`,
    );
  }

  /**
   * Build alert message
   */
  private buildAlertMessage(
    rule: AlertRuleWithChannels,
    context: AlertContext,
  ): string {
    const parts = [`[${rule.name}]`];

    if (context.workflowName) {
      parts.push(`Workflow: ${context.workflowName}`);
    }
    if (context.nodeName) {
      parts.push(`Node: ${context.nodeName}`);
    }
    if (context.errorMessage) {
      parts.push(`Error: ${context.errorMessage}`);
    }
    if (context.executionId) {
      parts.push(`Execution ID: ${context.executionId}`);
    }

    return parts.join(' | ');
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(
    channel: { type: AlertChannelType; config: any },
    message: string,
    severity: AlertSeverity,
    context: AlertContext,
  ): Promise<void> {
    switch (channel.type) {
      case 'EMAIL':
        await this.sendEmailAlert(channel.config, message, severity);
        break;
      case 'SLACK':
        await this.sendSlackAlert(channel.config, message, severity, context);
        break;
      case 'WEBHOOK':
        await this.sendWebhookAlert(channel.config, message, severity, context);
        break;
      case 'DISCORD':
        await this.sendDiscordAlert(channel.config, message, severity);
        break;
      case 'TEAMS':
        await this.sendTeamsAlert(channel.config, message, severity);
        break;
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(
    config: { recipients: string[] },
    message: string,
    severity: AlertSeverity,
  ): Promise<void> {
    // TODO: Implement email sending (via nodemailer, sendgrid, etc.)
    this.logger.log(`Email alert to ${config.recipients.join(', ')}: ${message}`);
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(
    config: { webhookUrl: string; channel?: string },
    message: string,
    severity: AlertSeverity,
    context: AlertContext,
  ): Promise<void> {
    const color = {
      INFO: '#36a64f',
      WARNING: '#ffcc00',
      ERROR: '#ff0000',
      CRITICAL: '#8b0000',
    }[severity];

    const payload = {
      channel: config.channel,
      attachments: [
        {
          color,
          title: `WS-Flows Alert: ${severity}`,
          text: message,
          fields: [
            context.workflowId && {
              title: 'Workflow',
              value: context.workflowName || context.workflowId,
              short: true,
            },
            context.executionId && {
              title: 'Execution',
              value: context.executionId,
              short: true,
            },
          ].filter(Boolean),
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(
    config: { url: string; headers?: Record<string, string> },
    message: string,
    severity: AlertSeverity,
    context: AlertContext,
  ): Promise<void> {
    const payload = {
      type: 'alert',
      severity,
      message,
      timestamp: new Date().toISOString(),
      context: {
        teamId: context.teamId,
        workflowId: context.workflowId,
        workflowName: context.workflowName,
        executionId: context.executionId,
        nodeId: context.nodeId,
        nodeName: context.nodeName,
        errorMessage: context.errorMessage,
      },
    };

    await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(
    config: { webhookUrl: string },
    message: string,
    severity: AlertSeverity,
  ): Promise<void> {
    const color = {
      INFO: 0x36a64f,
      WARNING: 0xffcc00,
      ERROR: 0xff0000,
      CRITICAL: 0x8b0000,
    }[severity];

    const payload = {
      embeds: [
        {
          title: `WS-Flows Alert: ${severity}`,
          description: message,
          color,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Send Microsoft Teams alert
   */
  private async sendTeamsAlert(
    config: { webhookUrl: string },
    message: string,
    severity: AlertSeverity,
  ): Promise<void> {
    const themeColor = {
      INFO: '36a64f',
      WARNING: 'ffcc00',
      ERROR: 'ff0000',
      CRITICAL: '8b0000',
    }[severity];

    const payload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: `WS-Flows Alert: ${severity}`,
      sections: [
        {
          activityTitle: `WS-Flows Alert: ${severity}`,
          text: message,
        },
      ],
    };

    await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Create alert rule
   */
  async createAlertRule(
    teamId: string,
    data: {
      name: string;
      description?: string;
      condition: AlertCondition;
      threshold?: number;
      workflowId?: string;
      cooldownMs?: number;
      channels: Array<{
        type: AlertChannelType;
        config: Record<string, any>;
      }>;
    },
  ) {
    return this.prisma.alertRule.create({
      data: {
        teamId,
        name: data.name,
        description: data.description,
        condition: data.condition,
        threshold: data.threshold,
        workflowId: data.workflowId,
        cooldownMs: data.cooldownMs || 300000,
        channels: {
          create: data.channels.map((ch) => ({
            type: ch.type,
            config: ch.config as any,
          })),
        },
      },
      include: { channels: true },
    });
  }

  /**
   * Get alert rules for a team
   */
  async getAlertRules(teamId: string) {
    return this.prisma.alertRule.findMany({
      where: { teamId },
      include: { channels: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single alert rule by ID with team validation
   */
  async getAlertRuleById(teamId: string, ruleId: string) {
    return this.prisma.alertRule.findFirst({
      where: { id: ruleId, teamId },
      include: { channels: true },
    });
  }

  /**
   * Send a test alert for a rule (for testing channel configuration)
   */
  async sendTestAlert(teamId: string, ruleId: string): Promise<{ success: boolean; message: string }> {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, teamId },
      include: { channels: { where: { isActive: true } } },
    });

    if (!rule) {
      return { success: false, message: 'Alert rule not found' };
    }

    const testContext: AlertContext = {
      teamId,
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      executionId: 'test-execution',
      errorMessage: 'This is a test alert',
    };

    try {
      await this.fireAlert(rule as AlertRuleWithChannels, testContext, 'INFO');
      return { success: true, message: 'Test alert sent successfully' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send test alert: ${message}`);
      return { success: false, message: `Failed to send test alert: ${message}` };
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(
    teamId: string,
    options?: {
      alertRuleId?: string;
      acknowledged?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.AlertHistoryWhereInput = {};

    if (options?.alertRuleId) {
      where.alertRuleId = options.alertRuleId;
    }
    if (options?.acknowledged !== undefined) {
      where.acknowledged = options.acknowledged;
    }

    // Filter by team through alert rule
    const ruleIds = await this.prisma.alertRule.findMany({
      where: { teamId },
      select: { id: true },
    });
    where.alertRuleId = { in: ruleIds.map((r) => r.id) };

    const [data, total] = await Promise.all([
      this.prisma.alertHistory.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.alertHistory.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertHistoryId: string, userId: string) {
    return this.prisma.alertHistory.update({
      where: { id: alertHistoryId },
      data: {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }
}
