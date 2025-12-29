import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { DistributedQueueService, QueueJob, JobResult, JobPriority } from './distributed-queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as os from 'os';

// ============================================================================
// INTERFACES
// ============================================================================

export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;  // Queue size to trigger scale up
  scaleDownThreshold: number; // Queue size to trigger scale down
  scaleUpCooldown: number;   // ms between scale up operations
  scaleDownCooldown: number; // ms between scale down operations
  warmupEnabled: boolean;
  warmupPoolSize: number;
  affinityEnabled: boolean;
  affinityBuckets: number;
}

interface PooledWorker {
  id: string;
  status: 'warming' | 'ready' | 'busy' | 'cooling' | 'stopped';
  affinityKeys: string[];
  currentJobs: number;
  maxConcurrency: number;
  startedAt: number;
  lastActivityAt: number;
  totalProcessed: number;
  warmupComplete: boolean;
}

interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'none';
  count: number;
  reason: string;
}

export interface PoolMetrics {
  totalWorkers: number;
  activeWorkers: number;
  warmWorkers: number;
  busyWorkers: number;
  queueDepth: number;
  processingRate: number;
  avgLatency: number;
  cpuUsage: number;
  memoryUsage: number;
}

// ============================================================================
// WORKER POOL SERVICE
// ============================================================================

@Injectable()
export class WorkerPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerPoolService.name);

  private workers = new Map<string, PooledWorker>();
  private warmPool: string[] = []; // Pre-warmed workers ready to use
  private config: WorkerPoolConfig;

  private scalingInterval: NodeJS.Timeout | null = null;
  private metricsInterval: NodeJS.Timeout | null = null;
  private lastScaleUp = 0;
  private lastScaleDown = 0;

  // Metrics tracking
  private processingRateSamples: number[] = [];
  private latencySamples: number[] = [];
  private readonly maxSamples = 100;

  constructor(
    private queueService: DistributedQueueService,
    private redis: RedisService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.config = {
      minWorkers: this.configService.get<number>('POOL_MIN_WORKERS', 2),
      maxWorkers: this.configService.get<number>('POOL_MAX_WORKERS', 20),
      scaleUpThreshold: this.configService.get<number>('POOL_SCALE_UP_THRESHOLD', 100),
      scaleDownThreshold: this.configService.get<number>('POOL_SCALE_DOWN_THRESHOLD', 10),
      scaleUpCooldown: this.configService.get<number>('POOL_SCALE_UP_COOLDOWN', 30000),
      scaleDownCooldown: this.configService.get<number>('POOL_SCALE_DOWN_COOLDOWN', 60000),
      warmupEnabled: this.configService.get<boolean>('POOL_WARMUP_ENABLED', true),
      warmupPoolSize: this.configService.get<number>('POOL_WARMUP_SIZE', 3),
      affinityEnabled: this.configService.get<boolean>('POOL_AFFINITY_ENABLED', true),
      affinityBuckets: this.configService.get<number>('POOL_AFFINITY_BUCKETS', 16),
    };
  }

  async onModuleInit() {
    await this.initializePool();
    this.startScalingLoop();
    this.startMetricsLoop();

    // Subscribe to job events
    this.eventEmitter.on('queue.job.completed', this.onJobCompleted.bind(this));

    this.logger.log(`Worker pool initialized with ${this.workers.size} workers`);
  }

  async onModuleDestroy() {
    await this.shutdownPool();
  }

  // ============================================================================
  // POOL INITIALIZATION
  // ============================================================================

  /**
   * Initialize the worker pool with minimum workers
   */
  private async initializePool(): Promise<void> {
    this.logger.log(`Initializing worker pool: min=${this.config.minWorkers}, max=${this.config.maxWorkers}`);

    // Start minimum number of workers
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.spawnWorker();
    }

    // Pre-warm additional workers if enabled
    if (this.config.warmupEnabled) {
      for (let i = 0; i < this.config.warmupPoolSize; i++) {
        await this.spawnWarmWorker();
      }
    }
  }

  /**
   * Spawn a new active worker
   */
  private async spawnWorker(affinityKeys?: string[]): Promise<string> {
    const workerId = `pool-worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const worker: PooledWorker = {
      id: workerId,
      status: 'warming',
      affinityKeys: affinityKeys || this.generateAffinityKeys(),
      currentJobs: 0,
      maxConcurrency: this.configService.get<number>('WORKER_CONCURRENCY', 10),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      totalProcessed: 0,
      warmupComplete: false,
    };

    this.workers.set(workerId, worker);

    // Register with queue service
    await this.queueService.registerWorker(
      {
        id: workerId,
        queues: ['workflow:executions'],
        concurrency: worker.maxConcurrency,
        affinityKeys: worker.affinityKeys,
        warmupHandler: this.config.warmupEnabled ? () => this.warmupWorker(workerId) : undefined,
        pollInterval: 50,
      },
      (job) => this.handleJob(workerId, job),
    );

    worker.status = 'ready';
    worker.warmupComplete = true;

    this.logger.debug(`Spawned worker ${workerId} with affinity keys: ${worker.affinityKeys.join(', ')}`);
    return workerId;
  }

  /**
   * Spawn a pre-warmed worker that stays in pool until needed
   */
  private async spawnWarmWorker(): Promise<string> {
    const workerId = `warm-worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const worker: PooledWorker = {
      id: workerId,
      status: 'warming',
      affinityKeys: [],
      currentJobs: 0,
      maxConcurrency: this.configService.get<number>('WORKER_CONCURRENCY', 10),
      startedAt: Date.now(),
      lastActivityAt: Date.now(),
      totalProcessed: 0,
      warmupComplete: false,
    };

    this.workers.set(workerId, worker);

    // Perform warmup
    await this.warmupWorker(workerId);

    worker.warmupComplete = true;
    worker.status = 'ready';
    this.warmPool.push(workerId);

    this.logger.debug(`Created warm worker ${workerId}`);
    return workerId;
  }

  /**
   * Warm up a worker by pre-loading common resources
   */
  private async warmupWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    const startTime = Date.now();

    try {
      // Pre-load node definitions (simulate import)
      const { getNode } = await import('@ws-flows/nodes');

      // Pre-compile common expression patterns
      const commonExpressions = [
        '{{ $input.data }}',
        '{{ $trigger.body }}',
        '{{ $nodes.previousNode.data }}',
        '{{ $env.API_KEY }}',
      ];

      // Pre-warm JIT compilation
      for (const expr of commonExpressions) {
        try {
          new Function('$input', '$trigger', '$nodes', '$env', `return ${expr}`);
        } catch {
          // Ignore compilation errors during warmup
        }
      }

      // Pre-connect to external services if needed
      // This could include warming HTTP connection pools, etc.

      const duration = Date.now() - startTime;
      this.logger.debug(`Worker ${workerId} warmed up in ${duration}ms`);

    } catch (error) {
      this.logger.warn(`Worker ${workerId} warmup failed:`, error);
    }
  }

  /**
   * Generate affinity keys for a worker
   */
  private generateAffinityKeys(): string[] {
    const keys: string[] = [];
    const bucketCount = this.config.affinityBuckets;

    // Assign this worker to a subset of affinity buckets
    const bucketsPerWorker = Math.max(1, Math.floor(bucketCount / this.config.maxWorkers));
    const startBucket = Math.floor(Math.random() * bucketCount);

    for (let i = 0; i < bucketsPerWorker; i++) {
      const bucket = (startBucket + i) % bucketCount;
      keys.push(`bucket-${bucket}`);
    }

    return keys;
  }

  // ============================================================================
  // JOB HANDLING
  // ============================================================================

  /**
   * Handle a job from the queue
   */
  private async handleJob(workerId: string, job: QueueJob): Promise<JobResult> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return { success: false, error: 'Worker not found', duration: 0, attempts: 1 };
    }

    const startTime = Date.now();
    worker.status = 'busy';
    worker.currentJobs++;
    worker.lastActivityAt = Date.now();

    try {
      // Emit job start event for execution service to handle
      this.eventEmitter.emit('worker.job.start', {
        workerId,
        job,
      });

      // Wait for execution to complete via event
      const result = await new Promise<JobResult>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Job execution timeout'));
        }, job.timeout);

        const handler = (data: { jobId: string; result: JobResult }) => {
          if (data.jobId === job.id) {
            clearTimeout(timeout);
            this.eventEmitter.off('worker.job.done', handler);
            resolve(data.result);
          }
        };

        this.eventEmitter.on('worker.job.done', handler);
      });

      const duration = Date.now() - startTime;
      this.recordLatency(duration);

      return {
        ...result,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration,
        attempts: job.attempts + 1,
      };

    } finally {
      worker.currentJobs--;
      worker.totalProcessed++;
      worker.status = worker.currentJobs > 0 ? 'busy' : 'ready';
    }
  }

  /**
   * Record job completion for metrics
   */
  private onJobCompleted(data: { jobId: string; result: JobResult }): void {
    this.recordProcessingRate();
  }

  // ============================================================================
  // AUTO-SCALING
  // ============================================================================

  /**
   * Start the auto-scaling loop
   */
  private startScalingLoop(): void {
    this.scalingInterval = setInterval(async () => {
      try {
        const decision = await this.evaluateScaling();

        if (decision.action !== 'none') {
          this.logger.log(`Scaling decision: ${decision.action} by ${decision.count} (${decision.reason})`);

          if (decision.action === 'scale_up') {
            await this.scaleUp(decision.count);
          } else {
            await this.scaleDown(decision.count);
          }
        }
      } catch (error) {
        this.logger.error('Scaling loop error', error);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Evaluate whether to scale up or down
   */
  private async evaluateScaling(): Promise<ScalingDecision> {
    const now = Date.now();
    const metrics = await this.getPoolMetrics();
    const activeWorkers = this.getActiveWorkerCount();

    // Check scale up
    if (
      metrics.queueDepth > this.config.scaleUpThreshold &&
      activeWorkers < this.config.maxWorkers &&
      now - this.lastScaleUp > this.config.scaleUpCooldown
    ) {
      const workersNeeded = Math.min(
        Math.ceil(metrics.queueDepth / this.config.scaleUpThreshold),
        this.config.maxWorkers - activeWorkers,
      );

      return {
        action: 'scale_up',
        count: workersNeeded,
        reason: `Queue depth ${metrics.queueDepth} > threshold ${this.config.scaleUpThreshold}`,
      };
    }

    // Check scale down
    if (
      metrics.queueDepth < this.config.scaleDownThreshold &&
      activeWorkers > this.config.minWorkers &&
      now - this.lastScaleDown > this.config.scaleDownCooldown
    ) {
      // Only scale down idle workers
      const idleWorkers = [...this.workers.values()].filter(
        w => w.status === 'ready' && w.currentJobs === 0 && !this.warmPool.includes(w.id),
      );

      const workersToRemove = Math.min(
        idleWorkers.length,
        activeWorkers - this.config.minWorkers,
      );

      if (workersToRemove > 0) {
        return {
          action: 'scale_down',
          count: workersToRemove,
          reason: `Queue depth ${metrics.queueDepth} < threshold ${this.config.scaleDownThreshold}`,
        };
      }
    }

    return { action: 'none', count: 0, reason: '' };
  }

  /**
   * Scale up by adding workers
   */
  private async scaleUp(count: number): Promise<void> {
    this.lastScaleUp = Date.now();

    // First, activate any warm workers
    const warmToActivate = Math.min(count, this.warmPool.length);
    for (let i = 0; i < warmToActivate; i++) {
      const warmWorkerId = this.warmPool.shift()!;
      const worker = this.workers.get(warmWorkerId);
      if (worker) {
        worker.affinityKeys = this.generateAffinityKeys();

        // Register the warm worker with the queue
        await this.queueService.registerWorker(
          {
            id: warmWorkerId,
            queues: ['workflow:executions'],
            concurrency: worker.maxConcurrency,
            affinityKeys: worker.affinityKeys,
            pollInterval: 50,
          },
          (job) => this.handleJob(warmWorkerId, job),
        );

        this.logger.log(`Activated warm worker ${warmWorkerId}`);
      }
    }

    // Spawn additional workers if needed
    const toSpawn = count - warmToActivate;
    for (let i = 0; i < toSpawn; i++) {
      await this.spawnWorker();
    }

    // Replenish warm pool
    if (this.config.warmupEnabled) {
      const warmDeficit = this.config.warmupPoolSize - this.warmPool.length;
      for (let i = 0; i < warmDeficit; i++) {
        this.spawnWarmWorker().catch(err => {
          this.logger.warn('Failed to replenish warm pool', err);
        });
      }
    }

    this.logger.log(`Scaled up: activated ${warmToActivate} warm, spawned ${toSpawn} new`);
  }

  /**
   * Scale down by removing workers
   */
  private async scaleDown(count: number): Promise<void> {
    this.lastScaleDown = Date.now();

    // Find idle workers to remove
    const idleWorkers = [...this.workers.values()]
      .filter(w => w.status === 'ready' && w.currentJobs === 0 && !this.warmPool.includes(w.id))
      .sort((a, b) => a.totalProcessed - b.totalProcessed); // Remove least used first

    for (let i = 0; i < Math.min(count, idleWorkers.length); i++) {
      const worker = idleWorkers[i];
      await this.removeWorker(worker.id);
    }

    this.logger.log(`Scaled down by ${count} workers`);
  }

  /**
   * Remove a worker from the pool
   */
  private async removeWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.status = 'cooling';

    // Wait for current jobs to complete (with timeout)
    const startTime = Date.now();
    while (worker.currentJobs > 0 && Date.now() - startTime < 30000) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await this.queueService.stopWorker(workerId);
    worker.status = 'stopped';
    this.workers.delete(workerId);

    this.logger.debug(`Removed worker ${workerId}`);
  }

  // ============================================================================
  // METRICS & MONITORING
  // ============================================================================

  /**
   * Start the metrics collection loop
   */
  private startMetricsLoop(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getPoolMetrics();

        // Store metrics in Redis for dashboard access
        await this.redis.set('pool:metrics', metrics, 60);

        // Emit metrics event
        this.eventEmitter.emit('pool.metrics', metrics);

      } catch (error) {
        this.logger.error('Metrics loop error', error);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Get current pool metrics
   */
  async getPoolMetrics(): Promise<PoolMetrics> {
    const workers = [...this.workers.values()];

    const totalWorkers = workers.length;
    const activeWorkers = workers.filter(w => w.status !== 'stopped' && !this.warmPool.includes(w.id)).length;
    const warmWorkers = this.warmPool.length;
    const busyWorkers = workers.filter(w => w.status === 'busy').length;

    // Get queue depth
    let queueDepth = 0;
    try {
      queueDepth = await this.queueService.getQueueSize('workflow:executions');
    } catch {
      // Ignore
    }

    // Calculate processing rate
    const processingRate = this.processingRateSamples.length > 0
      ? this.processingRateSamples.reduce((a, b) => a + b, 0) / this.processingRateSamples.length
      : 0;

    // Calculate average latency
    const avgLatency = this.latencySamples.length > 0
      ? this.latencySamples.reduce((a, b) => a + b, 0) / this.latencySamples.length
      : 0;

    // Get system metrics
    const cpuUsage = os.loadavg()[0] / os.cpus().length * 100;
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    return {
      totalWorkers,
      activeWorkers,
      warmWorkers,
      busyWorkers,
      queueDepth,
      processingRate,
      avgLatency,
      cpuUsage,
      memoryUsage,
    };
  }

  /**
   * Record a processing rate sample
   */
  private recordProcessingRate(): void {
    const now = Date.now();

    // Simple rate: jobs per second over last interval
    if (this.processingRateSamples.length >= this.maxSamples) {
      this.processingRateSamples.shift();
    }
    this.processingRateSamples.push(1); // Count
  }

  /**
   * Record a latency sample
   */
  private recordLatency(duration: number): void {
    if (this.latencySamples.length >= this.maxSamples) {
      this.latencySamples.shift();
    }
    this.latencySamples.push(duration);
  }

  /**
   * Get count of active (non-warm, non-stopped) workers
   */
  private getActiveWorkerCount(): number {
    return [...this.workers.values()].filter(
      w => w.status !== 'stopped' && !this.warmPool.includes(w.id),
    ).length;
  }

  // ============================================================================
  // AFFINITY ROUTING
  // ============================================================================

  /**
   * Get affinity key for a workflow
   */
  getAffinityKey(workflowId: string): string {
    if (!this.config.affinityEnabled) {
      return '';
    }

    // Hash workflow ID to affinity bucket
    const hash = workflowId.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);

    const bucket = Math.abs(hash) % this.config.affinityBuckets;
    return `bucket-${bucket}`;
  }

  /**
   * Find best worker for a job based on affinity
   */
  findAffinityWorker(affinityKey: string): string | null {
    if (!affinityKey) return null;

    // Find workers that handle this affinity key
    const eligibleWorkers = [...this.workers.values()].filter(
      w => w.status === 'ready' && w.affinityKeys.includes(affinityKey) && w.currentJobs < w.maxConcurrency,
    );

    if (eligibleWorkers.length === 0) return null;

    // Return least busy worker
    eligibleWorkers.sort((a, b) => a.currentJobs - b.currentJobs);
    return eligibleWorkers[0].id;
  }

  // ============================================================================
  // SHUTDOWN
  // ============================================================================

  /**
   * Gracefully shutdown the pool
   */
  private async shutdownPool(): Promise<void> {
    this.logger.log('Shutting down worker pool...');

    if (this.scalingInterval) {
      clearInterval(this.scalingInterval);
    }

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Stop all workers
    const stopPromises = [...this.workers.keys()].map(id => this.removeWorker(id));
    await Promise.all(stopPromises);

    this.logger.log('Worker pool shut down');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get worker statistics
   */
  getWorkerStats(): { id: string; status: string; jobs: number; processed: number }[] {
    return [...this.workers.values()].map(w => ({
      id: w.id,
      status: w.status,
      jobs: w.currentJobs,
      processed: w.totalProcessed,
    }));
  }

  /**
   * Force scale up
   */
  async forceScaleUp(count: number): Promise<void> {
    const toAdd = Math.min(count, this.config.maxWorkers - this.getActiveWorkerCount());
    if (toAdd > 0) {
      await this.scaleUp(toAdd);
    }
  }

  /**
   * Force scale down
   */
  async forceScaleDown(count: number): Promise<void> {
    const toRemove = Math.min(count, this.getActiveWorkerCount() - this.config.minWorkers);
    if (toRemove > 0) {
      await this.scaleDown(toRemove);
    }
  }

  /**
   * Get pool configuration
   */
  getConfig(): WorkerPoolConfig {
    return { ...this.config };
  }

  /**
   * Update pool configuration
   */
  updateConfig(updates: Partial<WorkerPoolConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.log('Pool configuration updated');
  }
}
