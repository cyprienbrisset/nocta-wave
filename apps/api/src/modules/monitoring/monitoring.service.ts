import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../database/redis.service';
import { TeamService } from '../team/team.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MetricsQueryDto,
  RealTimeMetricsDto,
  LogQueryDto,
  CreateLogDto,
  TraceQueryDto,
  CreateSpanDto,
  MetricPeriod,
  LogLevel,
} from './dto/monitoring.dto';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private teamService: TeamService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ============================================================================
  // REAL-TIME METRICS
  // ============================================================================

  /**
   * Get real-time metrics for a team (with access check)
   */
  async getRealTimeMetrics(teamId: string, userId: string): Promise<RealTimeMetricsDto> {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);
    return this.getRealTimeMetricsInternal(teamId);
  }

  /**
   * Internal method to get real-time metrics without access check
   * Used by scheduled jobs that run in system context
   */
  private async getRealTimeMetricsInternal(teamId: string): Promise<RealTimeMetricsDto> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Get execution counts
    const [
      totalExecutions,
      runningExecutions,
      queuedExecutions,
      completedLastHour,
      failedLastHour,
      recentErrors,
      activeWorkflows,
    ] = await Promise.all([
      this.prisma.execution.count({
        where: { workflow: { teamId } },
      }),
      this.prisma.execution.count({
        where: { workflow: { teamId }, status: 'RUNNING' },
      }),
      this.prisma.execution.count({
        where: { workflow: { teamId }, status: { in: ['PENDING', 'QUEUED'] } },
      }),
      this.prisma.execution.count({
        where: {
          workflow: { teamId },
          status: 'COMPLETED',
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.execution.count({
        where: {
          workflow: { teamId },
          status: 'FAILED',
          createdAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.execution.count({
        where: {
          workflow: { teamId },
          status: 'FAILED',
          createdAt: { gte: fiveMinutesAgo },
        },
      }),
      this.prisma.workflow.count({
        where: { teamId, isActive: true },
      }),
    ]);

    // Calculate average duration from recent executions
    const recentExecutions = await this.prisma.execution.findMany({
      where: {
        workflow: { teamId },
        status: 'COMPLETED',
        duration: { not: null },
        createdAt: { gte: oneHourAgo },
      },
      select: { duration: true },
      take: 100,
    });

    const avgDuration =
      recentExecutions.length > 0
        ? recentExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / recentExecutions.length
        : 0;

    // Get queue depth from Redis
    const queueDepth = await this.redis.llen('workflow:executions');

    // Calculate success rate
    const totalLastHour = completedLastHour + failedLastHour;
    const successRate = totalLastHour > 0 ? (completedLastHour / totalLastHour) * 100 : 100;

    // Calculate executions per minute (last 5 minutes)
    const executionsLastFiveMin = await this.prisma.execution.count({
      where: {
        workflow: { teamId },
        createdAt: { gte: fiveMinutesAgo },
      },
    });
    const executionsPerMinute = executionsLastFiveMin / 5;

    return {
      totalExecutions,
      runningExecutions,
      queuedExecutions,
      successRate: Math.round(successRate * 10) / 10,
      avgDuration: Math.round(avgDuration),
      executionsPerMinute: Math.round(executionsPerMinute * 100) / 100,
      queueDepth,
      activeWorkflows,
      recentErrors,
      timestamp: now,
    };
  }

  /**
   * Get historical metrics
   */
  async getMetrics(teamId: string, userId: string, query: MetricsQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const period = query.period || MetricPeriod.HOUR;

    const snapshots = await this.prisma.metricSnapshot.findMany({
      where: {
        teamId,
        period,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    // If no snapshots, generate from raw data
    if (snapshots.length === 0) {
      return this.generateMetricsFromRawData(teamId, startDate, endDate, period);
    }

    return snapshots.map((s) => ({
      timestamp: s.timestamp,
      totalExecutions: s.totalExecutions,
      successfulExecutions: s.successfulExecutions,
      failedExecutions: s.failedExecutions,
      avgDuration: s.avgDuration,
      p95Duration: s.p95Duration,
      executionsPerMinute: s.executionsPerMinute,
      queueDepth: s.queueDepth,
    }));
  }

  /**
   * Generate metrics from raw execution data
   */
  private async generateMetricsFromRawData(
    teamId: string,
    startDate: Date,
    endDate: Date,
    period: MetricPeriod,
  ) {
    const intervalMs =
      period === MetricPeriod.MINUTE
        ? 60 * 1000
        : period === MetricPeriod.HOUR
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    const executions = await this.prisma.execution.findMany({
      where: {
        workflow: { teamId },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<number, typeof executions>();

    for (const execution of executions) {
      const bucketKey = Math.floor(execution.createdAt.getTime() / intervalMs) * intervalMs;
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, []);
      }
      buckets.get(bucketKey)!.push(execution);
    }

    const metrics = [];
    for (const [timestamp, execs] of buckets) {
      const successful = execs.filter((e) => e.status === 'COMPLETED').length;
      const failed = execs.filter((e) => e.status === 'FAILED').length;
      const durations = execs.filter((e) => e.duration != null).map((e) => e.duration!);

      metrics.push({
        timestamp: new Date(timestamp),
        totalExecutions: execs.length,
        successfulExecutions: successful,
        failedExecutions: failed,
        avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        p95Duration: durations.length > 0 ? this.calculatePercentile(durations, 95) : null,
        executionsPerMinute: period === MetricPeriod.MINUTE ? execs.length : execs.length / (intervalMs / 60000),
        queueDepth: 0,
      });
    }

    return metrics;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(teamId: string, userId: string, hours: number = 24) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const executions = await this.prisma.execution.findMany({
      where: {
        workflow: { teamId },
        status: 'COMPLETED',
        duration: { not: null },
        createdAt: { gte: since },
      },
      select: { duration: true },
    });

    const durations = executions.map((e) => e.duration!).sort((a, b) => a - b);

    if (durations.length === 0) {
      return {
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50Duration: 0,
        p95Duration: 0,
        p99Duration: 0,
        throughput: 0,
        period: `${hours}h`,
      };
    }

    return {
      avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50Duration: this.calculatePercentile(durations, 50),
      p95Duration: this.calculatePercentile(durations, 95),
      p99Duration: this.calculatePercentile(durations, 99),
      throughput: Math.round((durations.length / hours) * 100) / 100,
      period: `${hours}h`,
    };
  }

  /**
   * Get per-workflow metrics
   */
  async getWorkflowMetrics(teamId: string, userId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const workflows = await this.prisma.workflow.findMany({
      where: { teamId },
      select: {
        id: true,
        name: true,
        _count: {
          select: { executions: true },
        },
        executions: {
          select: {
            status: true,
            duration: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    return workflows.map((w) => {
      const completed = w.executions.filter((e) => e.status === 'COMPLETED').length;
      const total = w.executions.length;
      const durations = w.executions.filter((e) => e.duration != null).map((e) => e.duration!);

      return {
        workflowId: w.id,
        workflowName: w.name,
        totalExecutions: w._count.executions,
        successRate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 100,
        avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
        lastExecution: w.executions[0]?.createdAt || null,
      };
    });
  }

  // ============================================================================
  // STRUCTURED LOGS
  // ============================================================================

  /**
   * Query structured logs
   */
  async queryLogs(teamId: string, userId: string, query: LogQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const where: any = { teamId };

    if (query.levels && query.levels.length > 0) {
      where.level = { in: query.levels };
    }

    if (query.workflowId) {
      where.workflowId = query.workflowId;
    }

    if (query.executionId) {
      where.executionId = query.executionId;
    }

    if (query.nodeId) {
      where.nodeId = query.nodeId;
    }

    if (query.traceId) {
      where.traceId = query.traceId;
    }

    if (query.startDate || query.endDate) {
      where.timestamp = {};
      if (query.startDate) {
        where.timestamp.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.timestamp.lte = new Date(query.endDate);
      }
    }

    if (query.query) {
      where.message = { contains: query.query, mode: 'insensitive' };
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { hasEvery: query.tags };
    }

    const [logs, total] = await Promise.all([
      this.prisma.structuredLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: query.skip || 0,
        take: query.take || 100,
      }),
      this.prisma.structuredLog.count({ where }),
    ]);

    return {
      data: logs,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 100)) + 1,
      pageSize: query.take || 100,
    };
  }

  /**
   * Create a structured log entry
   */
  async createLog(teamId: string, log: CreateLogDto) {
    const createdLog = await this.prisma.structuredLog.create({
      data: {
        teamId,
        level: log.level as any,
        message: log.message,
        context: log.context,
        workflowId: log.workflowId,
        executionId: log.executionId,
        nodeId: log.nodeId,
        traceId: log.traceId,
        spanId: log.spanId,
        parentSpanId: log.parentSpanId,
        source: log.source,
        tags: log.tags || [],
      },
    });

    // Emit event for real-time log streaming
    this.eventEmitter.emit('log.created', {
      teamId,
      log: createdLog,
    });

    // Publish to Redis for distributed systems
    await this.redis.publish('monitoring:log', {
      teamId,
      log: createdLog,
    });

    return createdLog;
  }

  /**
   * Get log statistics
   */
  async getLogStats(teamId: string, userId: string, hours: number = 24) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const stats = await this.prisma.structuredLog.groupBy({
      by: ['level'],
      where: {
        teamId,
        timestamp: { gte: since },
      },
      _count: true,
    });

    const byLevel = stats.reduce(
      (acc, s) => {
        acc[s.level] = s._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: Object.values(byLevel).reduce((a, b) => a + b, 0),
      byLevel,
      period: `${hours}h`,
    };
  }

  // ============================================================================
  // DISTRIBUTED TRACING
  // ============================================================================

  /**
   * Query traces
   */
  async queryTraces(teamId: string, userId: string, query: TraceQueryDto) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const where: any = { teamId };

    if (query.traceId) {
      where.traceId = query.traceId;
    }

    if (query.executionId) {
      where.executionId = query.executionId;
    }

    if (query.serviceName) {
      where.serviceName = query.serviceName;
    }

    if (query.operationName) {
      where.operationName = { contains: query.operationName, mode: 'insensitive' };
    }

    if (query.minDuration) {
      where.duration = { gte: query.minDuration * 1000 }; // Convert ms to microseconds
    }

    if (query.hasError) {
      where.status = 'ERROR';
    }

    if (query.startDate || query.endDate) {
      where.startTime = {};
      if (query.startDate) {
        where.startTime.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.startTime.lte = new Date(query.endDate);
      }
    }

    // Get root spans only for trace list
    where.parentSpanId = null;

    const [spans, total] = await Promise.all([
      this.prisma.traceSpan.findMany({
        where,
        orderBy: { startTime: 'desc' },
        skip: query.skip || 0,
        take: query.take || 50,
      }),
      this.prisma.traceSpan.count({ where }),
    ]);

    // Get trace summaries
    const traceSummaries = await Promise.all(
      spans.map(async (rootSpan) => {
        const allSpans = await this.prisma.traceSpan.findMany({
          where: { traceId: rootSpan.traceId },
        });

        const services = [...new Set(allSpans.map((s) => s.serviceName))];
        const hasErrors = allSpans.some((s) => s.status === 'ERROR');
        const totalDuration = allSpans.reduce((max, s) => {
          const dur = s.duration || 0;
          return dur > max ? dur : max;
        }, 0);

        return {
          traceId: rootSpan.traceId,
          rootSpan,
          spanCount: allSpans.length,
          duration: totalDuration,
          hasErrors,
          services,
          startTime: rootSpan.startTime,
        };
      }),
    );

    return {
      data: traceSummaries,
      total,
      page: Math.floor((query.skip || 0) / (query.take || 50)) + 1,
      pageSize: query.take || 50,
    };
  }

  /**
   * Get a full trace by ID
   */
  async getTrace(teamId: string, userId: string, traceId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const spans = await this.prisma.traceSpan.findMany({
      where: { teamId, traceId },
      orderBy: { startTime: 'asc' },
    });

    if (spans.length === 0) {
      return null;
    }

    // Build span tree
    const spanMap = new Map(spans.map((s) => [s.spanId, s]));
    const rootSpans = spans.filter((s) => !s.parentSpanId);

    const buildTree = (span: any): any => ({
      ...span,
      children: spans.filter((s) => s.parentSpanId === span.spanId).map(buildTree),
    });

    return {
      traceId,
      spans,
      tree: rootSpans.map(buildTree),
      services: [...new Set(spans.map((s) => s.serviceName))],
      duration: Math.max(...spans.map((s) => s.duration || 0)),
      hasErrors: spans.some((s) => s.status === 'ERROR'),
    };
  }

  /**
   * Create a trace span
   */
  async createSpan(teamId: string, span: CreateSpanDto) {
    const createdSpan = await this.prisma.traceSpan.create({
      data: {
        teamId,
        traceId: span.traceId,
        spanId: span.spanId,
        parentSpanId: span.parentSpanId,
        operationName: span.operationName,
        serviceName: span.serviceName,
        startTime: new Date(span.startTime),
        endTime: span.endTime ? new Date(span.endTime) : undefined,
        duration: span.duration,
        status: (span.status as any) || 'UNSET',
        statusMessage: span.statusMessage,
        attributes: span.attributes,
        events: span.events,
        executionId: span.executionId,
        nodeId: span.nodeId,
      },
    });

    // Emit event
    this.eventEmitter.emit('span.created', {
      teamId,
      span: createdSpan,
    });

    return createdSpan;
  }

  /**
   * End a span
   */
  async endSpan(
    teamId: string,
    spanId: string,
    data: {
      endTime: Date;
      status?: string;
      statusMessage?: string;
    },
  ) {
    const span = await this.prisma.traceSpan.findFirst({
      where: { teamId, spanId },
    });

    if (!span) {
      return null;
    }

    const duration = data.endTime.getTime() - span.startTime.getTime();

    return this.prisma.traceSpan.update({
      where: { id: span.id },
      data: {
        endTime: data.endTime,
        duration: duration * 1000, // Convert to microseconds
        status: (data.status as any) || 'OK',
        statusMessage: data.statusMessage,
      },
    });
  }

  // ============================================================================
  // ALERTS
  // ============================================================================

  /**
   * Check alert thresholds (used by scheduled jobs - no user context)
   */
  async checkAlertThresholds(teamId: string) {
    const alertRules = await this.prisma.alertRule.findMany({
      where: { teamId, isActive: true },
      include: { channels: true },
    });

    // Use internal method since this is called from a scheduled job without user context
    const metrics = await this.getRealTimeMetricsInternal(teamId);

    for (const rule of alertRules) {
      const shouldFire = await this.evaluateAlertCondition(rule, metrics);

      if (shouldFire) {
        // Check cooldown
        if (rule.lastFiredAt) {
          const cooldownEnd = new Date(rule.lastFiredAt.getTime() + rule.cooldownMs);
          if (new Date() < cooldownEnd) {
            continue; // Still in cooldown
          }
        }

        await this.fireAlert(rule, metrics);
      }
    }
  }

  private async evaluateAlertCondition(rule: any, metrics: RealTimeMetricsDto): Promise<boolean> {
    switch (rule.condition) {
      case 'EXECUTION_FAILED':
        return metrics.recentErrors > 0;
      case 'ERROR_RATE_THRESHOLD':
        return metrics.successRate < (100 - (rule.threshold || 10));
      case 'QUEUE_DEPTH':
        return metrics.queueDepth > (rule.threshold || 100);
      case 'CONSECUTIVE_FAILURES':
        return metrics.recentErrors >= (rule.threshold || 3);
      default:
        return false;
    }
  }

  private async fireAlert(rule: any, metrics: RealTimeMetricsDto) {
    // Update last fired
    await this.prisma.alertRule.update({
      where: { id: rule.id },
      data: { lastFiredAt: new Date() },
    });

    // Create alert history
    const alert = await this.prisma.alertHistory.create({
      data: {
        alertRuleId: rule.id,
        message: `Alert: ${rule.name} - ${rule.condition}`,
        severity: 'WARNING',
        sentTo: rule.channels.map((c: any) => c.type),
      },
    });

    // Emit event
    this.eventEmitter.emit('alert.fired', {
      alert,
      rule,
      metrics,
    });

    // Publish to Redis for real-time notification
    await this.redis.publish('monitoring:alert', {
      alertId: alert.id,
      ruleName: rule.name,
      condition: rule.condition,
      severity: 'WARNING',
    });

    this.logger.warn(`Alert fired: ${rule.name}`);
  }

  /**
   * Get active (unacknowledged) alerts
   */
  async getActiveAlerts(teamId: string, userId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']);

    const alerts = await this.prisma.alertHistory.findMany({
      where: {
        alertRule: { teamId },
        acknowledged: false,
      },
      include: {
        alertRule: {
          include: {
            workflow: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return alerts.map((a) => ({
      id: a.id,
      ruleName: a.alertRule.name,
      condition: a.alertRule.condition,
      message: a.message,
      severity: a.severity,
      workflowId: a.alertRule.workflow?.id || null,
      workflowName: a.alertRule.workflow?.name || null,
      firedAt: a.createdAt,
      acknowledged: a.acknowledged,
    }));
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(teamId: string, userId: string, alertId: string) {
    await this.teamService.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN', 'MEMBER']);

    const alert = await this.prisma.alertHistory.findFirst({
      where: {
        id: alertId,
        alertRule: { teamId },
      },
    });

    if (!alert) {
      throw new Error('Alert not found');
    }

    return this.prisma.alertHistory.update({
      where: { id: alertId },
      data: {
        acknowledged: true,
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  // ============================================================================
  // SCHEDULED TASKS
  // ============================================================================

  /**
   * Aggregate metrics every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async aggregateMinuteMetrics() {
    const teams = await this.prisma.team.findMany({
      select: { id: true },
    });

    for (const team of teams) {
      try {
        await this.createMetricSnapshot(team.id, MetricPeriod.MINUTE);
      } catch (error) {
        this.logger.error(`Failed to aggregate metrics for team ${team.id}`, error);
      }
    }
  }

  /**
   * Aggregate hourly metrics
   */
  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics() {
    const teams = await this.prisma.team.findMany({
      select: { id: true },
    });

    for (const team of teams) {
      try {
        await this.createMetricSnapshot(team.id, MetricPeriod.HOUR);
      } catch (error) {
        this.logger.error(`Failed to aggregate hourly metrics for team ${team.id}`, error);
      }
    }
  }

  /**
   * Check alert thresholds every minute
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkAllAlerts() {
    const teams = await this.prisma.team.findMany({
      select: { id: true },
    });

    for (const team of teams) {
      try {
        await this.checkAlertThresholds(team.id);
      } catch (error) {
        this.logger.error(`Failed to check alerts for team ${team.id}`, error);
      }
    }
  }

  /**
   * Clean up old logs (retention: 30 days)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldLogs() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    await this.prisma.structuredLog.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    await this.prisma.traceSpan.deleteMany({
      where: { startTime: { lt: thirtyDaysAgo } },
    });

    this.logger.log('Cleaned up old monitoring data');
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private async createMetricSnapshot(teamId: string, period: MetricPeriod) {
    const now = new Date();
    const intervalMs = period === MetricPeriod.MINUTE ? 60 * 1000 : period === MetricPeriod.HOUR ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const since = new Date(now.getTime() - intervalMs);

    const executions = await this.prisma.execution.findMany({
      where: {
        workflow: { teamId },
        createdAt: { gte: since, lt: now },
      },
      select: {
        status: true,
        duration: true,
        errorMessage: true,
      },
    });

    if (executions.length === 0) {
      return; // No data to aggregate
    }

    const successful = executions.filter((e) => e.status === 'COMPLETED').length;
    const failed = executions.filter((e) => e.status === 'FAILED').length;
    const cancelled = executions.filter((e) => e.status === 'CANCELLED').length;
    const timedOut = executions.filter((e) => e.status === 'TIMEOUT').length;

    const durations = executions.filter((e) => e.duration != null).map((e) => e.duration!);

    // Count error types
    const errorTypes: Record<string, number> = {};
    executions
      .filter((e) => e.errorMessage)
      .forEach((e) => {
        const type = this.categorizeError(e.errorMessage!);
        errorTypes[type] = (errorTypes[type] || 0) + 1;
      });

    const queueDepth = await this.redis.llen('workflow:executions');

    await this.prisma.metricSnapshot.create({
      data: {
        teamId,
        period,
        timestamp: now,
        totalExecutions: executions.length,
        successfulExecutions: successful,
        failedExecutions: failed,
        cancelledExecutions: cancelled,
        timedOutExecutions: timedOut,
        avgDuration: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
        minDuration: durations.length > 0 ? Math.min(...durations) : null,
        maxDuration: durations.length > 0 ? Math.max(...durations) : null,
        p50Duration: durations.length > 0 ? this.calculatePercentile(durations, 50) : null,
        p95Duration: durations.length > 0 ? this.calculatePercentile(durations, 95) : null,
        p99Duration: durations.length > 0 ? this.calculatePercentile(durations, 99) : null,
        executionsPerMinute: executions.length / (intervalMs / 60000),
        errorTypes: Object.keys(errorTypes).length > 0 ? errorTypes : undefined,
        queueDepth,
      },
    });
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    const sorted = [...sortedValues].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private categorizeError(errorMessage: string): string {
    const msg = errorMessage.toLowerCase();
    if (msg.includes('timeout')) return 'timeout';
    if (msg.includes('connection')) return 'connection';
    if (msg.includes('auth')) return 'authentication';
    if (msg.includes('rate limit')) return 'rate_limit';
    if (msg.includes('not found')) return 'not_found';
    if (msg.includes('validation')) return 'validation';
    return 'unknown';
  }
}
