import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../database/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import * as crypto from 'crypto';

// ============================================================================
// INTERFACES
// ============================================================================

export interface QueueJob<T = unknown> {
  id: string;
  type: string;
  data: T;
  priority: JobPriority;
  createdAt: number;
  scheduledAt?: number;
  attempts: number;
  maxAttempts: number;
  backoff: BackoffStrategy;
  timeout: number;
  workflowId?: string;
  teamId?: string;
  tags?: string[];
  affinityKey?: string;
  parentJobId?: string;
}

export enum JobPriority {
  CRITICAL = 0,   // System critical, processed immediately
  HIGH = 1,       // User-triggered, high priority
  NORMAL = 2,     // Standard execution
  LOW = 3,        // Background tasks
  BULK = 4,       // Batch processing, lowest priority
}

export interface BackoffStrategy {
  type: 'fixed' | 'exponential' | 'linear';
  delay: number;
  maxDelay: number;
  multiplier?: number;
}

export interface QueueOptions {
  name: string;
  concurrency?: number;
  rateLimit?: {
    max: number;
    duration: number; // ms
  };
  defaultPriority?: JobPriority;
  defaultTimeout?: number;
  defaultMaxAttempts?: number;
  priorityLevels?: number;
}

export interface WorkerOptions {
  id?: string;
  queues: string[];
  concurrency?: number;
  affinityKeys?: string[];
  warmupHandler?: () => Promise<void>;
  pollInterval?: number;
}

export interface JobResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
  attempts: number;
}

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  byPriority: Record<number, number>;
}

export interface WorkerInfo {
  id: string;
  hostname: string;
  pid: number;
  queues: string[];
  affinityKeys: string[];
  status: 'idle' | 'busy' | 'draining' | 'offline';
  currentJobs: number;
  totalProcessed: number;
  lastHeartbeat: number;
  startedAt: number;
}

// ============================================================================
// DISTRIBUTED QUEUE SERVICE
// ============================================================================

@Injectable()
export class DistributedQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DistributedQueueService.name);
  private readonly workerId: string;
  private readonly hostname: string;
  private readonly pid: number;

  // Redis clients
  private subscriber: Redis | null = null;

  // Queue management
  private queues = new Map<string, QueueOptions>();
  private workers = new Map<string, { running: boolean; handler: (job: QueueJob) => Promise<JobResult> }>();
  private activeJobs = new Map<string, QueueJob>();

  // Heartbeat and cleanup
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  // Configuration
  private readonly heartbeatIntervalMs: number;
  private readonly workerTimeoutMs: number;
  private readonly jobLockTimeoutMs: number;
  private readonly maxQueueSize: number;

  constructor(
    private redis: RedisService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.workerId = `worker:${crypto.randomBytes(8).toString('hex')}`;
    this.hostname = process.env.HOSTNAME || 'localhost';
    this.pid = process.pid;

    this.heartbeatIntervalMs = this.configService.get<number>('QUEUE_HEARTBEAT_INTERVAL', 5000);
    this.workerTimeoutMs = this.configService.get<number>('QUEUE_WORKER_TIMEOUT', 30000);
    this.jobLockTimeoutMs = this.configService.get<number>('QUEUE_JOB_LOCK_TIMEOUT', 300000); // 5 min
    this.maxQueueSize = this.configService.get<number>('QUEUE_MAX_SIZE', 100000);
  }

  async onModuleInit() {
    this.startHeartbeat();
    this.startCleanupLoop();
    await this.setupSubscriber();
    this.logger.log(`Distributed queue service initialized: ${this.workerId}`);
  }

  async onModuleDestroy() {
    await this.gracefulShutdown();
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Register a new queue
   */
  registerQueue(options: QueueOptions): void {
    this.queues.set(options.name, {
      ...options,
      concurrency: options.concurrency ?? 10,
      defaultPriority: options.defaultPriority ?? JobPriority.NORMAL,
      defaultTimeout: options.defaultTimeout ?? 300000,
      defaultMaxAttempts: options.defaultMaxAttempts ?? 3,
      priorityLevels: options.priorityLevels ?? 5,
    });

    this.logger.log(`Registered queue: ${options.name}`);
  }

  /**
   * Add a job to a queue
   */
  async addJob<T>(
    queueName: string,
    type: string,
    data: T,
    options?: {
      priority?: JobPriority;
      delay?: number;
      timeout?: number;
      maxAttempts?: number;
      affinityKey?: string;
      workflowId?: string;
      teamId?: string;
      tags?: string[];
      parentJobId?: string;
    },
  ): Promise<string> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    // Check queue size limit
    const currentSize = await this.getQueueSize(queueName);
    if (currentSize >= this.maxQueueSize) {
      throw new Error(`Queue ${queueName} is full (max: ${this.maxQueueSize})`);
    }

    const jobId = `job:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
    const now = Date.now();

    const job: QueueJob<T> = {
      id: jobId,
      type,
      data,
      priority: options?.priority ?? queue.defaultPriority!,
      createdAt: now,
      scheduledAt: options?.delay ? now + options.delay : undefined,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? queue.defaultMaxAttempts!,
      backoff: {
        type: 'exponential',
        delay: 1000,
        maxDelay: 30000,
        multiplier: 2,
      },
      timeout: options?.timeout ?? queue.defaultTimeout!,
      workflowId: options?.workflowId,
      teamId: options?.teamId,
      tags: options?.tags,
      affinityKey: options?.affinityKey,
      parentJobId: options?.parentJobId,
    };

    // Store job data
    await this.redis.set(`queue:job:${jobId}`, job, 86400 * 7); // 7 days TTL

    if (job.scheduledAt && job.scheduledAt > now) {
      // Add to delayed set
      const client = this.redis.getClient();
      await client.zadd(`queue:${queueName}:delayed`, job.scheduledAt, jobId);
    } else {
      // Add to priority queue
      await this.addToPriorityQueue(queueName, jobId, job.priority);
    }

    // Notify workers
    await this.redis.publish('queue:job:added', {
      queueName,
      jobId,
      priority: job.priority,
      affinityKey: job.affinityKey,
    });

    this.logger.debug(`Added job ${jobId} to queue ${queueName} with priority ${job.priority}`);

    return jobId;
  }

  /**
   * Add job to priority queue using Redis sorted set
   */
  private async addToPriorityQueue(
    queueName: string,
    jobId: string,
    priority: JobPriority,
  ): Promise<void> {
    const client = this.redis.getClient();
    // Score = priority * 1e13 + timestamp for FIFO within priority
    const score = priority * 1e13 + Date.now();
    await client.zadd(`queue:${queueName}:waiting`, score, jobId);
  }

  /**
   * Get next job from queue with affinity support
   */
  async getNextJob(
    queueName: string,
    affinityKeys?: string[],
  ): Promise<QueueJob | null> {
    const client = this.redis.getClient();

    // Move delayed jobs that are due
    await this.processDelayedJobs(queueName);

    // Check affinity queues first
    if (affinityKeys && affinityKeys.length > 0) {
      for (const key of affinityKeys) {
        const affinityQueueKey = `queue:${queueName}:affinity:${key}`;
        const result = await client.zpopmin(affinityQueueKey, 1);
        if (result.length > 0) {
          const jobId = result[0];
          return this.lockAndGetJob(jobId, queueName);
        }
      }
    }

    // Get from main priority queue
    const result = await client.zpopmin(`queue:${queueName}:waiting`, 1);
    if (result.length === 0) {
      return null;
    }

    const jobId = result[0];
    return this.lockAndGetJob(jobId, queueName);
  }

  /**
   * Lock and retrieve job data
   */
  private async lockAndGetJob(jobId: string, queueName: string): Promise<QueueJob | null> {
    const client = this.redis.getClient();

    // Try to acquire lock
    const lockKey = `queue:lock:${jobId}`;
    const lockAcquired = await client.set(lockKey, this.workerId, 'PX', this.jobLockTimeoutMs, 'NX');

    if (!lockAcquired) {
      return null; // Another worker got it
    }

    // Get job data
    const job = await this.redis.get<QueueJob>(`queue:job:${jobId}`);
    if (!job) {
      await client.del(lockKey);
      return null;
    }

    // Move to active set
    await client.zadd(`queue:${queueName}:active`, Date.now(), jobId);
    this.activeJobs.set(jobId, job);

    return job;
  }

  /**
   * Complete a job
   */
  async completeJob(jobId: string, result: JobResult): Promise<void> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      this.logger.warn(`Trying to complete unknown job: ${jobId}`);
      return;
    }

    const client = this.redis.getClient();
    const queueName = this.getQueueNameFromJob(job);

    // Remove from active set
    await client.zrem(`queue:${queueName}:active`, jobId);

    // Remove lock
    await client.del(`queue:lock:${jobId}`);

    // Store result
    await this.redis.set(`queue:result:${jobId}`, result, 86400 * 7);

    // Update counters
    const counterKey = result.success
      ? `queue:${queueName}:completed`
      : `queue:${queueName}:failed`;
    await client.incr(counterKey);

    // Emit event
    this.eventEmitter.emit('queue.job.completed', {
      jobId,
      queueName,
      result,
    });

    this.activeJobs.delete(jobId);
    this.logger.debug(`Job ${jobId} completed: ${result.success ? 'success' : 'failed'}`);
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string, error: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (!job) {
      return false;
    }

    const client = this.redis.getClient();
    const queueName = this.getQueueNameFromJob(job);

    job.attempts++;

    if (job.attempts >= job.maxAttempts) {
      // Move to dead letter queue
      await this.moveToDeadLetterQueue(queueName, jobId, job, error);
      this.activeJobs.delete(jobId);
      return false;
    }

    // Calculate backoff delay
    const delay = this.calculateBackoff(job.backoff, job.attempts);
    job.scheduledAt = Date.now() + delay;

    // Update job data
    await this.redis.set(`queue:job:${jobId}`, job, 86400 * 7);

    // Remove from active and add to delayed
    await client.zrem(`queue:${queueName}:active`, jobId);
    await client.zadd(`queue:${queueName}:delayed`, job.scheduledAt, jobId);

    // Remove lock
    await client.del(`queue:lock:${jobId}`);

    this.activeJobs.delete(jobId);
    this.logger.log(`Job ${jobId} scheduled for retry in ${delay}ms (attempt ${job.attempts})`);

    return true;
  }

  /**
   * Calculate backoff delay
   */
  private calculateBackoff(strategy: BackoffStrategy, attempt: number): number {
    let delay: number;

    switch (strategy.type) {
      case 'exponential':
        delay = strategy.delay * Math.pow(strategy.multiplier || 2, attempt - 1);
        break;
      case 'linear':
        delay = strategy.delay * attempt;
        break;
      case 'fixed':
      default:
        delay = strategy.delay;
    }

    return Math.min(delay, strategy.maxDelay);
  }

  /**
   * Move job to dead letter queue
   */
  private async moveToDeadLetterQueue(
    queueName: string,
    jobId: string,
    job: QueueJob,
    error: string,
  ): Promise<void> {
    const client = this.redis.getClient();

    await client.zrem(`queue:${queueName}:active`, jobId);
    await client.del(`queue:lock:${jobId}`);

    // Store in DLQ
    await client.zadd(`queue:${queueName}:dlq`, Date.now(), jobId);
    await this.redis.set(`queue:dlq:${jobId}`, {
      job,
      error,
      failedAt: Date.now(),
    }, 86400 * 30); // 30 days TTL

    this.eventEmitter.emit('queue.job.dead', {
      jobId,
      queueName,
      error,
      attempts: job.attempts,
    });

    this.logger.warn(`Job ${jobId} moved to dead letter queue after ${job.attempts} attempts`);
  }

  /**
   * Process delayed jobs that are due
   */
  private async processDelayedJobs(queueName: string): Promise<void> {
    const client = this.redis.getClient();
    const now = Date.now();

    // Get jobs with score <= now
    const dueJobs = await client.zrangebyscore(
      `queue:${queueName}:delayed`,
      0,
      now,
      'LIMIT',
      0,
      100,
    );

    if (dueJobs.length === 0) return;

    // Move to waiting queue
    const pipeline = client.pipeline();
    for (const jobId of dueJobs) {
      pipeline.zrem(`queue:${queueName}:delayed`, jobId);

      // Get job to check affinity
      const job = await this.redis.get<QueueJob>(`queue:job:${jobId}`);
      if (job) {
        const score = job.priority * 1e13 + Date.now();

        if (job.affinityKey) {
          pipeline.zadd(`queue:${queueName}:affinity:${job.affinityKey}`, score, jobId);
        } else {
          pipeline.zadd(`queue:${queueName}:waiting`, score, jobId);
        }
      }
    }

    await pipeline.exec();

    if (dueJobs.length > 0) {
      this.logger.debug(`Moved ${dueJobs.length} delayed jobs to waiting queue`);
    }
  }

  // ============================================================================
  // WORKER MANAGEMENT
  // ============================================================================

  /**
   * Register a worker with the queue
   */
  async registerWorker(
    options: WorkerOptions,
    handler: (job: QueueJob) => Promise<JobResult>,
  ): Promise<string> {
    const workerId = options.id || this.workerId;

    this.workers.set(workerId, {
      running: false,
      handler,
    });

    // Store worker info
    const workerInfo: WorkerInfo = {
      id: workerId,
      hostname: this.hostname,
      pid: this.pid,
      queues: options.queues,
      affinityKeys: options.affinityKeys || [],
      status: 'idle',
      currentJobs: 0,
      totalProcessed: 0,
      lastHeartbeat: Date.now(),
      startedAt: Date.now(),
    };

    await this.redis.set(`queue:worker:${workerId}`, workerInfo, this.workerTimeoutMs * 2 / 1000);

    // Run warmup if provided
    if (options.warmupHandler) {
      this.logger.log(`Running warmup handler for worker ${workerId}`);
      try {
        await options.warmupHandler();
        this.logger.log(`Worker ${workerId} warmup completed`);
      } catch (error) {
        this.logger.error(`Worker ${workerId} warmup failed`, error);
      }
    }

    // Start processing
    this.startWorker(workerId, options);

    this.logger.log(`Worker ${workerId} registered for queues: ${options.queues.join(', ')}`);
    return workerId;
  }

  /**
   * Start worker polling loop
   */
  private startWorker(workerId: string, options: WorkerOptions): void {
    const worker = this.workers.get(workerId);
    if (!worker) return;

    worker.running = true;
    const concurrency = options.concurrency || 1;
    const pollInterval = options.pollInterval || 100;

    const poll = async () => {
      if (!worker.running) return;

      try {
        const currentJobs = this.activeJobs.size;

        if (currentJobs < concurrency) {
          // Try to get jobs from each queue
          for (const queueName of options.queues) {
            if (this.activeJobs.size >= concurrency) break;

            const job = await this.getNextJob(queueName, options.affinityKeys);
            if (job) {
              this.processJob(workerId, job, worker.handler);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Worker ${workerId} poll error`, error);
      }

      if (worker.running) {
        setTimeout(poll, pollInterval);
      }
    };

    poll();
  }

  /**
   * Process a single job
   */
  private async processJob(
    workerId: string,
    job: QueueJob,
    handler: (job: QueueJob) => Promise<JobResult>,
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Update worker status
      await this.updateWorkerStatus(workerId, 'busy');

      // Execute with timeout
      const timeoutPromise = new Promise<JobResult>((_, reject) => {
        setTimeout(() => reject(new Error(`Job timeout after ${job.timeout}ms`)), job.timeout);
      });

      const result = await Promise.race([
        handler(job),
        timeoutPromise,
      ]);

      await this.completeJob(job.id, {
        ...result,
        duration: Date.now() - startTime,
        attempts: job.attempts + 1,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      const retried = await this.retryJob(job.id, errorMessage);

      if (!retried) {
        await this.completeJob(job.id, {
          success: false,
          error: errorMessage,
          duration: Date.now() - startTime,
          attempts: job.attempts + 1,
        });
      }
    } finally {
      await this.updateWorkerStatus(workerId, 'idle');
    }
  }

  /**
   * Update worker status in Redis
   */
  private async updateWorkerStatus(workerId: string, status: WorkerInfo['status']): Promise<void> {
    const workerInfo = await this.redis.get<WorkerInfo>(`queue:worker:${workerId}`);
    if (workerInfo) {
      workerInfo.status = status;
      workerInfo.currentJobs = this.activeJobs.size;
      workerInfo.lastHeartbeat = Date.now();

      if (status === 'idle' && this.activeJobs.size === 0) {
        workerInfo.totalProcessed++;
      }

      await this.redis.set(`queue:worker:${workerId}`, workerInfo, this.workerTimeoutMs * 2 / 1000);
    }
  }

  /**
   * Stop a worker
   */
  async stopWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.running = false;
      await this.updateWorkerStatus(workerId, 'draining');

      // Wait for active jobs to complete (with timeout)
      const startTime = Date.now();
      while (this.activeJobs.size > 0 && Date.now() - startTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await this.updateWorkerStatus(workerId, 'offline');
      this.workers.delete(workerId);

      this.logger.log(`Worker ${workerId} stopped`);
    }
  }

  // ============================================================================
  // METRICS & MONITORING
  // ============================================================================

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const client = this.redis.getClient();

    const [waiting, active, delayed, completed, failed] = await Promise.all([
      client.zcard(`queue:${queueName}:waiting`),
      client.zcard(`queue:${queueName}:active`),
      client.zcard(`queue:${queueName}:delayed`),
      client.get(`queue:${queueName}:completed`),
      client.get(`queue:${queueName}:failed`),
    ]);

    // Count by priority
    const byPriority: Record<number, number> = {};
    for (let p = 0; p <= 4; p++) {
      const minScore = p * 1e13;
      const maxScore = (p + 1) * 1e13 - 1;
      const count = await client.zcount(`queue:${queueName}:waiting`, minScore, maxScore);
      byPriority[p] = count;
    }

    return {
      name: queueName,
      waiting,
      active,
      completed: parseInt(completed || '0', 10),
      failed: parseInt(failed || '0', 10),
      delayed,
      paused: false, // TODO: Implement pause support
      byPriority,
    };
  }

  /**
   * Get queue size (waiting jobs only)
   */
  async getQueueSize(queueName: string): Promise<number> {
    const client = this.redis.getClient();
    return client.zcard(`queue:${queueName}:waiting`);
  }

  /**
   * Get all active workers
   */
  async getWorkers(): Promise<WorkerInfo[]> {
    const keys = await this.redis.keys('queue:worker:*');
    const workers: WorkerInfo[] = [];

    for (const key of keys) {
      const workerInfo = await this.redis.get<WorkerInfo>(key);
      if (workerInfo) {
        workers.push(workerInfo);
      }
    }

    return workers;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<QueueJob | null> {
    return this.redis.get<QueueJob>(`queue:job:${jobId}`);
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string): Promise<JobResult | null> {
    return this.redis.get<JobResult>(`queue:result:${jobId}`);
  }

  // ============================================================================
  // AFFINITY MANAGEMENT
  // ============================================================================

  /**
   * Route job to affinity queue
   */
  async routeToAffinityQueue(
    queueName: string,
    affinityKey: string,
    jobId: string,
    priority: JobPriority,
  ): Promise<void> {
    const client = this.redis.getClient();
    const score = priority * 1e13 + Date.now();
    await client.zadd(`queue:${queueName}:affinity:${affinityKey}`, score, jobId);
  }

  /**
   * Get affinity statistics
   */
  async getAffinityStats(queueName: string): Promise<Map<string, number>> {
    const client = this.redis.getClient();
    const pattern = `queue:${queueName}:affinity:*`;
    const keys = await client.keys(pattern);

    const stats = new Map<string, number>();
    for (const key of keys) {
      const affinityKey = key.split(':').pop()!;
      const count = await client.zcard(key);
      stats.set(affinityKey, count);
    }

    return stats;
  }

  // ============================================================================
  // INTERNAL HELPERS
  // ============================================================================

  private getQueueNameFromJob(job: QueueJob): string {
    // Find which queue this job belongs to
    for (const [name] of this.queues) {
      // In a real implementation, jobs would store their queue name
      // For now, we default to 'workflow:executions'
      return name;
    }
    return 'workflow:executions';
  }

  private async setupSubscriber(): Promise<void> {
    try {
      this.subscriber = this.redis.createSubscriber();

      await this.subscriber.subscribe('queue:job:added', 'queue:worker:control');

      this.subscriber.on('message', async (channel: string, message: string) => {
        try {
          const data = JSON.parse(message);

          if (channel === 'queue:worker:control') {
            await this.handleWorkerControl(data);
          }
        } catch (error) {
          this.logger.error('Failed to process pub/sub message', error);
        }
      });
    } catch (error) {
      this.logger.error('Failed to setup subscriber', error);
    }
  }

  private async handleWorkerControl(data: { action: string; workerId?: string }): Promise<void> {
    switch (data.action) {
      case 'pause':
        if (data.workerId === this.workerId || !data.workerId) {
          // Pause all workers
          for (const [id, worker] of this.workers) {
            worker.running = false;
            await this.updateWorkerStatus(id, 'draining');
          }
        }
        break;
      case 'resume':
        // Resume logic
        break;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      for (const [workerId] of this.workers) {
        const workerInfo = await this.redis.get<WorkerInfo>(`queue:worker:${workerId}`);
        if (workerInfo) {
          workerInfo.lastHeartbeat = Date.now();
          workerInfo.currentJobs = this.activeJobs.size;
          await this.redis.set(`queue:worker:${workerId}`, workerInfo, this.workerTimeoutMs * 2 / 1000);
        }
      }
    }, this.heartbeatIntervalMs);
  }

  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupStaleJobs();
        await this.cleanupDeadWorkers();
      } catch (error) {
        this.logger.error('Cleanup loop error', error);
      }
    }, 60000); // Every minute
  }

  private async cleanupStaleJobs(): Promise<void> {
    const client = this.redis.getClient();
    const now = Date.now();
    const staleThreshold = now - this.jobLockTimeoutMs * 2;

    for (const [queueName] of this.queues) {
      // Find jobs that have been active too long
      const staleJobs = await client.zrangebyscore(
        `queue:${queueName}:active`,
        0,
        staleThreshold,
      );

      for (const jobId of staleJobs) {
        // Check if lock still exists
        const lockExists = await client.exists(`queue:lock:${jobId}`);
        if (!lockExists) {
          // Job is stale, move back to waiting queue
          const job = await this.redis.get<QueueJob>(`queue:job:${jobId}`);
          if (job) {
            await client.zrem(`queue:${queueName}:active`, jobId);
            await this.addToPriorityQueue(queueName, jobId, job.priority);
            this.logger.warn(`Recovered stale job ${jobId}`);
          }
        }
      }
    }
  }

  private async cleanupDeadWorkers(): Promise<void> {
    const workers = await this.getWorkers();
    const now = Date.now();

    for (const worker of workers) {
      if (now - worker.lastHeartbeat > this.workerTimeoutMs) {
        // Worker is dead
        await this.redis.del(`queue:worker:${worker.id}`);
        this.logger.warn(`Removed dead worker: ${worker.id}`);
      }
    }
  }

  private async gracefulShutdown(): Promise<void> {
    // Stop all workers
    for (const [workerId] of this.workers) {
      await this.stopWorker(workerId);
    }

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.subscriber) {
      await this.subscriber.quit();
    }

    this.logger.log('Distributed queue service shut down');
  }
}
