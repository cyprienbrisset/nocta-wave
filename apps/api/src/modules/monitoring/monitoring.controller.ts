import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import {
  MetricsQueryDto,
  RealTimeMetricsDto,
  LogQueryDto,
  CreateLogDto,
  TraceQueryDto,
  CreateSpanDto,
} from './dto/monitoring.dto';

@ApiTags('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('teams/:teamId/monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  // ============================================================================
  // METRICS ENDPOINTS
  // ============================================================================

  @Get('metrics/realtime')
  @ApiOperation({ summary: 'Get real-time metrics' })
  @ApiResponse({ status: 200, type: RealTimeMetricsDto })
  async getRealTimeMetrics(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.monitoringService.getRealTimeMetrics(teamId, userId);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get historical metrics' })
  async getMetrics(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.monitoringService.getMetrics(teamId, userId, query);
  }

  @Get('metrics/performance')
  @ApiOperation({ summary: 'Get performance metrics (latency percentiles)' })
  async getPerformanceMetrics(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query('hours') hours?: number,
  ) {
    return this.monitoringService.getPerformanceMetrics(teamId, userId, hours || 24);
  }

  @Get('metrics/workflows')
  @ApiOperation({ summary: 'Get per-workflow metrics' })
  async getWorkflowMetrics(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.monitoringService.getWorkflowMetrics(teamId, userId);
  }

  // ============================================================================
  // LOGS ENDPOINTS
  // ============================================================================

  @Get('logs')
  @ApiOperation({ summary: 'Query structured logs' })
  async queryLogs(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query() query: LogQueryDto,
  ) {
    return this.monitoringService.queryLogs(teamId, userId, query);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Create a structured log entry' })
  async createLog(
    @Param('teamId') teamId: string,
    @Body() log: CreateLogDto,
  ) {
    return this.monitoringService.createLog(teamId, log);
  }

  @Get('logs/stats')
  @ApiOperation({ summary: 'Get log statistics' })
  async getLogStats(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query('hours') hours?: number,
  ) {
    return this.monitoringService.getLogStats(teamId, userId, hours || 24);
  }

  // ============================================================================
  // TRACING ENDPOINTS
  // ============================================================================

  @Get('traces')
  @ApiOperation({ summary: 'Query traces' })
  async queryTraces(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
    @Query() query: TraceQueryDto,
  ) {
    return this.monitoringService.queryTraces(teamId, userId, query);
  }

  @Get('traces/:traceId')
  @ApiOperation({ summary: 'Get a full trace by ID' })
  async getTrace(
    @Param('teamId') teamId: string,
    @Param('traceId') traceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.monitoringService.getTrace(teamId, userId, traceId);
  }

  @Post('traces/spans')
  @ApiOperation({ summary: 'Create a trace span' })
  async createSpan(
    @Param('teamId') teamId: string,
    @Body() span: CreateSpanDto,
  ) {
    return this.monitoringService.createSpan(teamId, span);
  }

  @Patch('traces/spans/:spanId/end')
  @ApiOperation({ summary: 'End a trace span' })
  async endSpan(
    @Param('teamId') teamId: string,
    @Param('spanId') spanId: string,
    @Body() data: { endTime: string; status?: string; statusMessage?: string },
  ) {
    return this.monitoringService.endSpan(teamId, spanId, {
      endTime: new Date(data.endTime),
      status: data.status,
      statusMessage: data.statusMessage,
    });
  }

  // ============================================================================
  // ALERTS ENDPOINTS
  // ============================================================================

  @Get('alerts')
  @ApiOperation({ summary: 'Get active alerts' })
  async getActiveAlerts(
    @Param('teamId') teamId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.monitoringService.getActiveAlerts(teamId, userId);
  }

  @Patch('alerts/:alertId/acknowledge')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  async acknowledgeAlert(
    @Param('teamId') teamId: string,
    @Param('alertId') alertId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.monitoringService.acknowledgeAlert(teamId, userId, alertId);
  }
}
