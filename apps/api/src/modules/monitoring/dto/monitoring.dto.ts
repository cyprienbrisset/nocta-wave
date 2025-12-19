import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MetricPeriod {
  MINUTE = 'MINUTE',
  HOUR = 'HOUR',
  DAY = 'DAY',
}

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

// ============================================================================
// METRICS DTOs
// ============================================================================

export class MetricsQueryDto {
  @ApiPropertyOptional({ description: 'Start date for metrics range' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for metrics range' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: MetricPeriod, default: MetricPeriod.HOUR })
  @IsOptional()
  @IsEnum(MetricPeriod)
  period?: MetricPeriod = MetricPeriod.HOUR;

  @ApiPropertyOptional({ description: 'Filter by workflow ID' })
  @IsOptional()
  @IsString()
  workflowId?: string;
}

export class RealTimeMetricsDto {
  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  runningExecutions: number;

  @ApiProperty()
  queuedExecutions: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  avgDuration: number;

  @ApiProperty()
  executionsPerMinute: number;

  @ApiProperty()
  queueDepth: number;

  @ApiProperty()
  activeWorkflows: number;

  @ApiProperty()
  recentErrors: number;

  @ApiProperty()
  timestamp: Date;
}

export class MetricSnapshotDto {
  @ApiProperty()
  timestamp: Date;

  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  successfulExecutions: number;

  @ApiProperty()
  failedExecutions: number;

  @ApiProperty()
  avgDuration: number | null;

  @ApiProperty()
  p95Duration: number | null;

  @ApiProperty()
  executionsPerMinute: number | null;

  @ApiProperty()
  queueDepth: number;
}

export class PerformanceMetricsDto {
  @ApiProperty()
  avgDuration: number;

  @ApiProperty()
  minDuration: number;

  @ApiProperty()
  maxDuration: number;

  @ApiProperty()
  p50Duration: number;

  @ApiProperty()
  p95Duration: number;

  @ApiProperty()
  p99Duration: number;

  @ApiProperty()
  throughput: number;

  @ApiProperty()
  period: string;
}

export class WorkflowMetricsDto {
  @ApiProperty()
  workflowId: string;

  @ApiProperty()
  workflowName: string;

  @ApiProperty()
  totalExecutions: number;

  @ApiProperty()
  successRate: number;

  @ApiProperty()
  avgDuration: number;

  @ApiProperty()
  lastExecution: Date | null;
}

// ============================================================================
// LOGS DTOs
// ============================================================================

export class LogQueryDto {
  @ApiPropertyOptional({ description: 'Search query for log messages' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ enum: LogLevel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(LogLevel, { each: true })
  levels?: LogLevel[];

  @ApiPropertyOptional({ description: 'Filter by workflow ID' })
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional({ description: 'Filter by execution ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ description: 'Filter by node ID' })
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional({ description: 'Filter by trace ID' })
  @IsOptional()
  @IsString()
  traceId?: string;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 100, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  take?: number = 100;

  @ApiPropertyOptional({ description: 'Filter by tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class StructuredLogDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: LogLevel })
  level: LogLevel;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  workflowId?: string;

  @ApiPropertyOptional()
  executionId?: string;

  @ApiPropertyOptional()
  nodeId?: string;

  @ApiPropertyOptional()
  traceId?: string;

  @ApiPropertyOptional()
  spanId?: string;

  @ApiPropertyOptional()
  source?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  timestamp: Date;
}

export class CreateLogDto {
  @ApiProperty({ enum: LogLevel })
  @IsEnum(LogLevel)
  level: LogLevel;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workflowId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  traceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentSpanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// ============================================================================
// TRACING DTOs
// ============================================================================

export class TraceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by trace ID' })
  @IsOptional()
  @IsString()
  traceId?: string;

  @ApiPropertyOptional({ description: 'Filter by execution ID' })
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional({ description: 'Filter by service name' })
  @IsOptional()
  @IsString()
  serviceName?: string;

  @ApiPropertyOptional({ description: 'Filter by operation name' })
  @IsOptional()
  @IsString()
  operationName?: string;

  @ApiPropertyOptional({ description: 'Minimum duration in ms' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minDuration?: number;

  @ApiPropertyOptional({ description: 'Only show error spans' })
  @IsOptional()
  hasError?: boolean;

  @ApiPropertyOptional({ description: 'Start date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({ default: 50, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number = 50;
}

export class TraceSpanDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  traceId: string;

  @ApiProperty()
  spanId: string;

  @ApiPropertyOptional()
  parentSpanId?: string;

  @ApiProperty()
  operationName: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty()
  startTime: Date;

  @ApiPropertyOptional()
  endTime?: Date;

  @ApiPropertyOptional()
  duration?: number;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  statusMessage?: string;

  @ApiPropertyOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional()
  events?: any[];

  @ApiPropertyOptional()
  executionId?: string;

  @ApiPropertyOptional()
  nodeId?: string;
}

export class TraceSummaryDto {
  @ApiProperty()
  traceId: string;

  @ApiProperty()
  rootSpan: TraceSpanDto;

  @ApiProperty()
  spanCount: number;

  @ApiProperty()
  duration: number;

  @ApiProperty()
  hasErrors: boolean;

  @ApiProperty()
  services: string[];

  @ApiProperty()
  startTime: Date;
}

export class CreateSpanDto {
  @ApiProperty()
  @IsString()
  traceId: string;

  @ApiProperty()
  @IsString()
  spanId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parentSpanId?: string;

  @ApiProperty()
  @IsString()
  operationName: string;

  @ApiProperty()
  @IsString()
  serviceName: string;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  duration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  statusMessage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  attributes?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  events?: any[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  executionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nodeId?: string;
}

// ============================================================================
// ALERTS DTOs
// ============================================================================

export class AlertThresholdDto {
  @ApiProperty({ description: 'Metric name to monitor' })
  @IsString()
  metric: string;

  @ApiProperty({ description: 'Threshold value' })
  @Type(() => Number)
  threshold: number;

  @ApiProperty({ description: 'Comparison operator', enum: ['gt', 'lt', 'gte', 'lte', 'eq'] })
  @IsString()
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';

  @ApiPropertyOptional({ description: 'Time window in seconds' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  windowSeconds?: number;
}

export class ActiveAlertDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  ruleName: string;

  @ApiProperty()
  condition: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  severity: string;

  @ApiProperty()
  workflowId: string | null;

  @ApiProperty()
  workflowName: string | null;

  @ApiProperty()
  firedAt: Date;

  @ApiProperty()
  acknowledged: boolean;
}
