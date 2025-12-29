import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  DistributedQueueService,
  JobPriority,
  QueueMetrics,
  WorkerInfo,
} from './distributed-queue.service';
import { WorkerPoolService, PoolMetrics } from './worker-pool.service';

@ApiTags('queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('queue')
export class QueueController {
  constructor(
    private queueService: DistributedQueueService,
    private workerPoolService: WorkerPoolService,
  ) {}

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  @Get('metrics/:queueName')
  @ApiOperation({ summary: 'Get queue metrics' })
  async getQueueMetrics(@Param('queueName') queueName: string): Promise<QueueMetrics> {
    return this.queueService.getQueueMetrics(queueName);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get job by ID' })
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.queueService.getJob(jobId);
    if (!job) {
      return { error: 'Job not found' };
    }
    return job;
  }

  @Get('jobs/:jobId/result')
  @ApiOperation({ summary: 'Get job result' })
  async getJobResult(@Param('jobId') jobId: string) {
    const result = await this.queueService.getJobResult(jobId);
    if (!result) {
      return { error: 'Result not found' };
    }
    return result;
  }

  @Get('affinity/:queueName')
  @ApiOperation({ summary: 'Get affinity statistics' })
  async getAffinityStats(@Param('queueName') queueName: string) {
    const stats = await this.queueService.getAffinityStats(queueName);
    return Object.fromEntries(stats);
  }

  // ============================================================================
  // WORKER MANAGEMENT
  // ============================================================================

  @Get('workers')
  @ApiOperation({ summary: 'Get all workers' })
  async getWorkers(): Promise<WorkerInfo[]> {
    return this.queueService.getWorkers();
  }

  @Get('pool/metrics')
  @ApiOperation({ summary: 'Get worker pool metrics' })
  async getPoolMetrics(): Promise<PoolMetrics> {
    return this.workerPoolService.getPoolMetrics();
  }

  @Get('pool/workers')
  @ApiOperation({ summary: 'Get pool worker stats' })
  async getPoolWorkerStats() {
    return this.workerPoolService.getWorkerStats();
  }

  @Get('pool/config')
  @ApiOperation({ summary: 'Get pool configuration' })
  async getPoolConfig() {
    return this.workerPoolService.getConfig();
  }

  @Post('pool/scale-up')
  @ApiOperation({ summary: 'Force scale up' })
  async scaleUp(@Body() body: { count: number }) {
    await this.workerPoolService.forceScaleUp(body.count);
    return { success: true };
  }

  @Post('pool/scale-down')
  @ApiOperation({ summary: 'Force scale down' })
  async scaleDown(@Body() body: { count: number }) {
    await this.workerPoolService.forceScaleDown(body.count);
    return { success: true };
  }

  // ============================================================================
  // JOB SUBMISSION (for testing/admin)
  // ============================================================================

  @Post('jobs')
  @ApiOperation({ summary: 'Submit a test job' })
  async submitJob(
    @Body()
    body: {
      queueName: string;
      type: string;
      data: Record<string, unknown>;
      priority?: JobPriority;
      delay?: number;
      affinityKey?: string;
    },
  ) {
    const jobId = await this.queueService.addJob(body.queueName, body.type, body.data, {
      priority: body.priority,
      delay: body.delay,
      affinityKey: body.affinityKey,
    });
    return { jobId };
  }
}
