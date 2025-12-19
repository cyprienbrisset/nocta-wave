import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { EncryptionService } from '../modules/credential/encryption.service';
import { getNode } from '@ws-flows/nodes';
import { topologicalSort } from '@ws-flows/shared';
import type { WorkflowGraph, NodeContext } from '@ws-flows/shared';

// ============================================================================
// INTERFACES
// ============================================================================

interface ExecutionJob {
  executionId: string;
  workflowId: string;
  teamId: string;
  graph: WorkflowGraph;
  inputData?: Record<string, any>;
  settings?: Record<string, any>;
  priority?: number;
  parentExecutionId?: string; // For sub-workflows
  resumeFromCheckpoint?: string; // For checkpoint recovery
}

interface NodeRetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'closed' | 'open' | 'half-open';
  nextRetryAt: number;
}

interface ExecutionCheckpoint {
  executionId: string;
  nodeId: string;
  nodeOutputs: Record<string, any>;
  executedNodes: string[];
  timestamp: number;
}

interface WorkerStats {
  isRunning: boolean;
  activeExecutions: number;
  processingCount: number;
  maxConcurrent: number;
  totalProcessed: number;
  totalFailed: number;
  totalCancelled: number;
  avgExecutionTimeMs: number;
  p50ExecutionTimeMs: number;
  p95ExecutionTimeMs: number;
  p99ExecutionTimeMs: number;
  queueLength: number;
  uptime: number;
  nodesExecutedTotal: number;
  circuitBreakersOpen: number;
}

interface NodeExecutionResult {
  nodeId: string;
  success: boolean;
  data?: any;
  outputHandle?: string;
  error?: string;
  duration: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_RETRY_CONFIG: NodeRetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

const DEFAULT_NODE_TIMEOUT_MS = 300000; // 5 minutes
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
const CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute
const CHECKPOINT_INTERVAL_NODES = 5; // Save checkpoint every N nodes
const MAX_PARALLEL_BRANCHES = 10; // Max concurrent branch executions

// ============================================================================
// WORKFLOW WORKER SERVICE
// ============================================================================

@Injectable()
export class WorkflowWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowWorkerService.name);
  private isRunning = false;
  private isShuttingDown = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeExecutions = new Map<string, AbortController>();
  private processingCount = 0;
  private readonly startTime = Date.now();

  // Configurable settings
  private readonly concurrentWorkers: number;
  private readonly pollIntervalIdle: number;
  private readonly pollIntervalBusy: number;
  private readonly batchSize: number;
  private readonly gracefulShutdownTimeoutMs: number;
  private readonly enableParallelBranches: boolean;
  private readonly enableCheckpoints: boolean;

  // Stats
  private totalProcessed = 0;
  private totalFailed = 0;
  private totalCancelled = 0;
  private nodesExecutedTotal = 0;
  private executionTimes: number[] = [];
  private readonly maxExecutionTimeSamples = 1000;

  // Circuit breakers per node type
  private circuitBreakers = new Map<string, CircuitBreakerState>();

  // Rate limiters per credential/service
  private rateLimiters = new Map<string, { tokens: number; lastRefill: number }>();

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private encryption: EncryptionService,
    private configService: ConfigService,
  ) {
    // Load configuration with defaults optimized for high throughput
    this.concurrentWorkers = this.configService.get<number>('WORKER_CONCURRENCY', 10);
    this.pollIntervalIdle = this.configService.get<number>('WORKER_POLL_INTERVAL_IDLE', 50);
    this.pollIntervalBusy = this.configService.get<number>('WORKER_POLL_INTERVAL_BUSY', 200);
    this.batchSize = this.configService.get<number>('WORKER_BATCH_SIZE', 5);
    this.gracefulShutdownTimeoutMs = this.configService.get<number>('WORKER_SHUTDOWN_TIMEOUT', 30000);
    this.enableParallelBranches = this.configService.get<boolean>('WORKER_PARALLEL_BRANCHES', true);
    this.enableCheckpoints = this.configService.get<boolean>('WORKER_CHECKPOINTS', true);
  }

  onModuleInit() {
    this.startPolling();
    this.setupCancellationListener();
    this.startHealthReporter();
    this.startCircuitBreakerMaintenance();
  }

  async onModuleDestroy() {
    await this.gracefulShutdown();
  }

  // ============================================================================
  // LIFECYCLE MANAGEMENT
  // ============================================================================

  private async gracefulShutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    this.isRunning = false;

    this.logger.log('Initiating graceful shutdown...');

    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
    }

    // Save checkpoints for active executions
    if (this.enableCheckpoints) {
      this.logger.log('Saving checkpoints for active executions...');
      // Checkpoints are saved during execution, nothing more to do here
    }

    // Wait for active executions to complete (with timeout)
    const shutdownStart = Date.now();
    while (
      this.activeExecutions.size > 0 &&
      Date.now() - shutdownStart < this.gracefulShutdownTimeoutMs
    ) {
      this.logger.log(
        `Waiting for ${this.activeExecutions.size} active executions to complete...`,
      );
      await this.sleep(1000);
    }

    // Cancel remaining executions if timeout exceeded
    if (this.activeExecutions.size > 0) {
      this.logger.warn(
        `Forcefully cancelling ${this.activeExecutions.size} executions due to shutdown timeout`,
      );
      for (const [executionId, controller] of this.activeExecutions) {
        controller.abort();
        this.logger.log(`Cancelled execution ${executionId} due to shutdown`);
      }
    }

    this.logger.log('Workflow worker shutdown complete');
  }

  private async setupCancellationListener() {
    try {
      const subscriber = this.redis.createSubscriber();
      subscriber.subscribe('execution:cancel');
      subscriber.on('message', (_channel: string, message: string) => {
        try {
          const data = JSON.parse(message) as { executionId: string };
          const controller = this.activeExecutions.get(data.executionId);
          if (controller) {
            controller.abort();
            this.logger.log(`Received cancellation request for execution ${data.executionId}`);
          }
        } catch (error) {
          this.logger.error('Failed to parse cancellation message', error);
        }
      });
    } catch (error) {
      this.logger.error('Failed to setup cancellation listener', error);
    }
  }

  private startHealthReporter() {
    setInterval(async () => {
      if (!this.isRunning) return;

      const stats = await this.getStats();
      this.logger.debug(
        `Worker stats: ${stats.processingCount}/${stats.maxConcurrent} busy, ` +
          `queue: ${stats.queueLength}, processed: ${stats.totalProcessed}, ` +
          `failed: ${stats.totalFailed}, p95: ${Math.round(stats.p95ExecutionTimeMs)}ms, ` +
          `circuit breakers open: ${stats.circuitBreakersOpen}`,
      );

      await this.redis.publish('worker:stats', stats);
    }, 30000);
  }

  private startCircuitBreakerMaintenance() {
    // Reset half-open circuit breakers periodically
    setInterval(() => {
      const now = Date.now();
      for (const [nodeType, state] of this.circuitBreakers) {
        if (state.state === 'open' && now >= state.nextRetryAt) {
          state.state = 'half-open';
          this.logger.log(`Circuit breaker for ${nodeType} moved to half-open`);
        }
      }
    }, 10000);
  }

  // ============================================================================
  // POLLING & JOB PROCESSING
  // ============================================================================

  private startPolling() {
    this.isRunning = true;
    this.logger.log(
      `Starting workflow worker with ${this.concurrentWorkers} concurrent processors, ` +
        `batch size: ${this.batchSize}, parallel branches: ${this.enableParallelBranches}, ` +
        `checkpoints: ${this.enableCheckpoints}`,
    );
    this.poll();
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      const availableSlots = this.concurrentWorkers - this.processingCount;

      if (availableSlots > 0) {
        const jobsToFetch = Math.min(availableSlots, this.batchSize);
        const jobs: ExecutionJob[] = [];

        // Try to fetch from priority queue first, then regular queue
        for (let i = 0; i < jobsToFetch; i++) {
          let jobData = await this.redis.rpop<ExecutionJob>('workflow:executions:priority');
          if (!jobData) {
            jobData = await this.redis.rpop<ExecutionJob>('workflow:executions');
          }
          if (jobData) {
            jobs.push(jobData);
          } else {
            break;
          }
        }

        for (const job of jobs) {
          this.processingCount++;
          this.logger.debug(
            `Processing execution: ${job.executionId} (${this.processingCount}/${this.concurrentWorkers} workers busy)`,
          );

          this.processExecution(job)
            .catch((error) => {
              this.logger.error(`Unexpected error in execution ${job.executionId}`, error);
            })
            .finally(() => {
              this.processingCount--;
            });
        }
      }
    } catch (error) {
      this.logger.error('Error polling for jobs', error);
    }

    const pollDelay =
      this.processingCount >= this.concurrentWorkers
        ? this.pollIntervalBusy
        : this.pollIntervalIdle;

    this.pollInterval = setTimeout(() => this.poll(), pollDelay);
  }

  // ============================================================================
  // EXECUTION ORCHESTRATION
  // ============================================================================

  private async processExecution(job: ExecutionJob) {
    const { executionId, workflowId, teamId, graph, inputData = {}, settings } = job;
    const startTime = Date.now();

    const abortController = new AbortController();
    this.activeExecutions.set(executionId, abortController);

    try {
      // Check if already cancelled
      const execution = await this.prisma.execution.findUnique({
        where: { id: executionId },
        select: { status: true },
      });

      if (execution?.status === 'CANCELLED') {
        this.logger.log(`Execution ${executionId} was already cancelled, skipping`);
        this.totalCancelled++;
        return;
      }

      // Update status to running
      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      await this.redis.publish('execution:started', {
        executionId,
        workflowId,
      });

      // Initialize execution state
      const nodeOutputs = new Map<string, any>();
      const executedNodes = new Set<string>();

      // Try to restore from checkpoint if resuming
      if (job.resumeFromCheckpoint) {
        await this.restoreFromCheckpoint(job.resumeFromCheckpoint, nodeOutputs, executedNodes);
      }

      // Set trigger data
      nodeOutputs.set('$trigger', inputData);
      nodeOutputs.set('$input', inputData);

      // Extract workflow variables
      const workflowVariables = this.extractWorkflowVariables(graph);

      // Collect and load credentials
      const credentialIds = this.collectCredentialIds(graph.nodes);
      const credentials = await this.loadCredentials(teamId, credentialIds);

      // Build execution graph for parallel processing
      const executionGraph = this.buildExecutionGraph(graph);

      // Execute with parallel branch support
      if (this.enableParallelBranches) {
        await this.executeWithParallelBranches(
          executionGraph,
          executionId,
          workflowId,
          graph,
          nodeOutputs,
          executedNodes,
          credentials,
          workflowVariables,
          inputData,
          settings,
          abortController,
        );
      } else {
        // Sequential execution (fallback)
        await this.executeSequential(
          graph,
          executionId,
          workflowId,
          nodeOutputs,
          executedNodes,
          credentials,
          workflowVariables,
          inputData,
          settings,
          abortController,
        );
      }

      const duration = Date.now() - startTime;
      this.recordExecutionTime(duration);

      const lastExecutedNode = [...executedNodes].pop();
      const outputData = lastExecutedNode ? nodeOutputs.get(lastExecutedNode) || {} : {};

      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'COMPLETED',
          outputData,
          finishedAt: new Date(),
          duration,
        },
      });

      await this.redis.publish('execution:completed', {
        executionId,
        workflowId,
        outputData,
        duration,
      });

      // Clean up checkpoint
      if (this.enableCheckpoints) {
        await this.deleteCheckpoint(executionId);
      }

      this.totalProcessed++;
      this.logger.log(`Execution ${executionId} completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordExecutionTime(duration);

      const errorMessage = error instanceof Error ? error.message : String(error);
      const isCancelled = errorMessage === 'Execution cancelled' || abortController.signal.aborted;

      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: isCancelled ? 'CANCELLED' : 'FAILED',
          errorMessage: isCancelled ? 'Cancelled by user' : errorMessage,
          finishedAt: new Date(),
          duration,
        },
      });

      await this.redis.publish(isCancelled ? 'execution:cancelled' : 'execution:failed', {
        executionId,
        workflowId,
        error: errorMessage,
        duration,
      });

      if (isCancelled) {
        this.totalCancelled++;
      } else {
        this.totalFailed++;
      }

      this.logger.log(
        `Execution ${executionId} ${isCancelled ? 'cancelled' : 'failed'}: ${errorMessage}`,
      );
    } finally {
      this.activeExecutions.delete(executionId);
    }
  }

  // ============================================================================
  // PARALLEL BRANCH EXECUTION
  // ============================================================================

  private buildExecutionGraph(graph: WorkflowGraph): Map<string, Set<string>> {
    // Build dependency graph: nodeId -> set of nodes that depend on it
    const dependencies = new Map<string, Set<string>>();
    const dependents = new Map<string, Set<string>>();

    for (const node of graph.nodes) {
      dependencies.set(node.id, new Set());
      dependents.set(node.id, new Set());
    }

    for (const edge of graph.edges) {
      dependencies.get(edge.target)?.add(edge.source);
      dependents.get(edge.source)?.add(edge.target);
    }

    return dependencies;
  }

  private async executeWithParallelBranches(
    dependencies: Map<string, Set<string>>,
    executionId: string,
    workflowId: string,
    graph: WorkflowGraph,
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
    credentials: Map<string, any>,
    workflowVariables: Record<string, any>,
    inputData: Record<string, any>,
    settings: Record<string, any> | undefined,
    abortController: AbortController,
  ) {
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const pendingNodes = new Set(graph.nodes.map((n) => n.id));
    const runningNodes = new Set<string>();
    let checkpointCounter = 0;

    // Remove already executed nodes
    for (const nodeId of executedNodes) {
      pendingNodes.delete(nodeId);
    }

    while (pendingNodes.size > 0 || runningNodes.size > 0) {
      if (abortController.signal.aborted) {
        throw new Error('Execution cancelled');
      }

      // Find nodes ready to execute (all dependencies satisfied)
      const readyNodes: string[] = [];
      for (const nodeId of pendingNodes) {
        const deps = dependencies.get(nodeId) || new Set();
        const allDepsSatisfied = [...deps].every(
          (dep) => executedNodes.has(dep) || !pendingNodes.has(dep),
        );

        if (allDepsSatisfied && this.shouldExecuteNode(nodeId, graph.edges, nodeOutputs, executedNodes)) {
          readyNodes.push(nodeId);
        }
      }

      if (readyNodes.length === 0 && runningNodes.size === 0) {
        // No more nodes to execute
        break;
      }

      // Limit parallel executions
      const nodesToRun = readyNodes.slice(0, MAX_PARALLEL_BRANCHES - runningNodes.size);

      // Start parallel execution
      const promises: Promise<NodeExecutionResult>[] = [];
      for (const nodeId of nodesToRun) {
        pendingNodes.delete(nodeId);
        runningNodes.add(nodeId);

        const node = nodeMap.get(nodeId);
        if (!node) continue;

        promises.push(
          this.executeNodeSafe(
            node,
            executionId,
            workflowId,
            graph,
            nodeOutputs,
            credentials,
            workflowVariables,
            inputData,
            settings,
            abortController,
          ),
        );
      }

      // Wait for at least one to complete
      if (promises.length > 0) {
        const results = await Promise.all(promises);

        for (const result of results) {
          runningNodes.delete(result.nodeId);

          if (result.success) {
            executedNodes.add(result.nodeId);
            nodeOutputs.set(result.nodeId, {
              data: result.data,
              outputHandle: result.outputHandle || 'output',
              __rawOutput: result.data,
            });
            this.nodesExecutedTotal++;
          } else if (result.error && result.error !== 'SKIPPED') {
            throw new Error(result.error);
          }
        }

        // Save checkpoint periodically
        checkpointCounter += results.length;
        if (this.enableCheckpoints && checkpointCounter >= CHECKPOINT_INTERVAL_NODES) {
          await this.saveCheckpoint(executionId, nodeOutputs, executedNodes);
          checkpointCounter = 0;
        }
      }

      // Small delay to prevent tight loop
      if (runningNodes.size >= MAX_PARALLEL_BRANCHES) {
        await this.sleep(10);
      }
    }
  }

  private async executeSequential(
    graph: WorkflowGraph,
    executionId: string,
    workflowId: string,
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
    credentials: Map<string, any>,
    workflowVariables: Record<string, any>,
    inputData: Record<string, any>,
    settings: Record<string, any> | undefined,
    abortController: AbortController,
  ) {
    const executionOrder = topologicalSort(graph.nodes, graph.edges);

    for (const node of executionOrder) {
      if (!node) continue;

      if (abortController.signal.aborted) {
        throw new Error('Execution cancelled');
      }

      if (!this.shouldExecuteNode(node.id, graph.edges, nodeOutputs, executedNodes)) {
        this.logger.debug(`Skipping node ${node.id} due to conditional routing`);
        continue;
      }

      await this.executeNode(
        node,
        executionId,
        workflowId,
        graph,
        nodeOutputs,
        executedNodes,
        credentials,
        workflowVariables,
        inputData,
        settings,
        abortController,
      );
    }
  }

  // ============================================================================
  // NODE EXECUTION
  // ============================================================================

  private async executeNodeSafe(
    node: any,
    executionId: string,
    workflowId: string,
    graph: WorkflowGraph,
    nodeOutputs: Map<string, any>,
    credentials: Map<string, any>,
    workflowVariables: Record<string, any>,
    inputData: Record<string, any>,
    settings: Record<string, any> | undefined,
    abortController: AbortController,
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    try {
      const executedNodes = new Set<string>();
      await this.executeNode(
        node,
        executionId,
        workflowId,
        graph,
        nodeOutputs,
        executedNodes,
        credentials,
        workflowVariables,
        inputData,
        settings,
        abortController,
      );

      const output = nodeOutputs.get(node.id);
      return {
        nodeId: node.id,
        success: true,
        data: output?.data,
        outputHandle: output?.outputHandle,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        nodeId: node.id,
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeNode(
    node: any,
    executionId: string,
    workflowId: string,
    graph: WorkflowGraph,
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
    credentials: Map<string, any>,
    workflowVariables: Record<string, any>,
    inputData: Record<string, any>,
    settings: Record<string, any> | undefined,
    abortController: AbortController,
  ) {
    const nodeType = node.data?.nodeType || node.type;
    const nodeDefinition = getNode(nodeType);
    if (!nodeDefinition) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(nodeType)) {
      throw new Error(`Circuit breaker open for ${nodeType}`);
    }

    const executionLog = await this.prisma.executionLog.create({
      data: {
        executionId,
        nodeId: node.id,
        nodeType,
        nodeName: node.data?.label || node.id,
        status: 'RUNNING',
        inputData: (node.data?.config || {}) as any,
      },
    });

    await this.redis.publish('execution:node:started', {
      executionId,
      nodeId: node.id,
      nodeName: node.data?.label,
    });

    const nodeStartTime = Date.now();
    const nodeData = node.data || {};

    const retryConfig: NodeRetryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...(nodeData.retry || {}),
    };
    const timeoutMs = nodeData.timeout || DEFAULT_NODE_TIMEOUT_MS;

    try {
      // Apply rate limiting if configured
      const credentialId = nodeData.credentialId || nodeData.credentials?.[0];
      if (credentialId) {
        await this.waitForRateLimit(credentialId, nodeData.rateLimit);
      }

      const previousData = this.gatherPreviousData(node.id, graph.edges, nodeOutputs);

      const resolvedConfig = this.resolveExpressions(nodeData.config || {}, {
        $trigger: inputData,
        $input: inputData,
        $nodes: Object.fromEntries(nodeOutputs),
        $env: process.env,
        variables: workflowVariables,
        workflow: { id: workflowId, name: settings?.name || '' },
        execution: { id: executionId, timestamp: new Date().toISOString() },
      });

      const nodeCredentials = credentialId ? credentials.get(credentialId) : undefined;

      const context: NodeContext = {
        logger: this.createLogger(executionId, node.id),
        executionId,
        workflowId,
        nodeId: node.id,
      };

      const result = await this.executeNodeWithRetry(
        nodeDefinition,
        { config: resolvedConfig, data: previousData, credentials: nodeCredentials },
        context,
        retryConfig,
        timeoutMs,
        abortController.signal,
        nodeType,
      );

      executedNodes.add(node.id);

      const outputData = result.data as Record<string, unknown> | undefined;

      // Get the output handle from the result, node definition outputs, or default to 'output'
      const nodeOutputsDef = nodeDefinition.outputs as Array<{ name: string }> | undefined;
      const defaultOutputHandle = nodeOutputsDef?.[0]?.name || 'output';
      const outputHandle = (outputData?.outputHandle as string | undefined) || defaultOutputHandle;

      this.logger.debug(`Node ${node.id} completed with outputHandle: ${outputHandle}`);

      nodeOutputs.set(node.id, {
        data: outputData?.data !== undefined ? outputData.data : outputData,
        outputHandle,
        __rawOutput: result.data,
      });

      const nodeDuration = Date.now() - nodeStartTime;

      await this.prisma.executionLog.update({
        where: { id: executionLog.id },
        data: {
          status: 'COMPLETED',
          outputData: result.data as any,
          finishedAt: new Date(),
          duration: nodeDuration,
        },
      });

      await this.redis.publish('execution:node:completed', {
        executionId,
        nodeId: node.id,
        nodeName: node.data?.label,
        outputData: result.data,
        duration: nodeDuration,
      });

      // Reset circuit breaker on success
      this.resetCircuitBreaker(nodeType);

      // Check for sub-workflow execution
      const resultData = result.data as Record<string, unknown> | undefined;
      if (resultData?.__isSubWorkflow === true) {
        const subWorkflowResult = await this.executeSubWorkflow(
          resultData,
          executionId,
          workflowId,
          settings,
          abortController,
        );

        // Update node outputs with sub-workflow result
        nodeOutputs.set(node.id, {
          data: subWorkflowResult,
          outputHandle: 'output',
          __rawOutput: subWorkflowResult,
        });

        // Update log with sub-workflow result
        await this.prisma.executionLog.update({
          where: { id: executionLog.id },
          data: {
            outputData: subWorkflowResult as any,
          },
        });
      }

      // Check for stop signal
      if (resultData?.stop === true) {
        throw new Error('STOP_EXECUTION');
      }
    } catch (error) {
      const nodeDuration = Date.now() - nodeStartTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Record circuit breaker failure
      this.recordCircuitBreakerFailure(nodeType);

      // Handle stop signal
      if (errorMessage === 'STOP_EXECUTION') {
        return;
      }

      // Handle cancellation
      if (errorMessage === 'Execution cancelled' || abortController.signal.aborted) {
        await this.prisma.executionLog.update({
          where: { id: executionLog.id },
          data: {
            status: 'SKIPPED',
            error: 'Execution cancelled by user',
            finishedAt: new Date(),
            duration: nodeDuration,
          },
        });
        throw error;
      }

      // Handle continueOnError
      if (nodeData.continueOnError) {
        this.logger.warn(`Node ${node.id} failed but continuing: ${errorMessage}`);

        executedNodes.add(node.id);
        nodeOutputs.set(node.id, {
          data: { error: errorMessage },
          outputHandle: 'error',
          __rawOutput: { error: errorMessage },
        });

        await this.prisma.executionLog.update({
          where: { id: executionLog.id },
          data: {
            status: 'COMPLETED',
            outputData: { error: errorMessage } as any,
            finishedAt: new Date(),
            duration: nodeDuration,
          },
        });

        await this.redis.publish('execution:node:completed', {
          executionId,
          nodeId: node.id,
          nodeName: node.data?.label,
          outputData: { error: errorMessage },
          duration: nodeDuration,
        });
        return;
      }

      await this.prisma.executionLog.update({
        where: { id: executionLog.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          finishedAt: new Date(),
          duration: nodeDuration,
        },
      });

      await this.redis.publish('execution:node:failed', {
        executionId,
        nodeId: node.id,
        error: errorMessage,
      });

      throw error;
    }
  }

  private async executeNodeWithRetry(
    nodeDefinition: any,
    input: { config: any; data: any; credentials?: any },
    context: NodeContext,
    retryConfig: NodeRetryConfig,
    timeoutMs: number,
    signal: AbortSignal,
    nodeType: string,
  ): Promise<any> {
    let lastError: Error | null = null;
    let delay = retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      if (signal.aborted) {
        throw new Error('Execution cancelled');
      }

      // Check circuit breaker before retry
      if (attempt > 1 && this.isCircuitBreakerOpen(nodeType)) {
        throw new Error(`Circuit breaker open for ${nodeType}`);
      }

      try {
        const result = await Promise.race([
          nodeDefinition.runner(input, context),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Node execution timed out after ${timeoutMs}ms`)),
              timeoutMs,
            ),
          ),
          new Promise((_, reject) => {
            const handler = () => reject(new Error('Execution cancelled'));
            signal.addEventListener('abort', handler, { once: true });
          }),
        ]);

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (lastError.message === 'Execution cancelled' || lastError.message.includes('timed out')) {
          throw lastError;
        }

        if (attempt < retryConfig.maxAttempts) {
          context.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms: ${lastError.message}`);
          await this.sleep(delay);
          delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        }
      }
    }

    throw lastError || new Error('Node execution failed');
  }

  // ============================================================================
  // CIRCUIT BREAKER
  // ============================================================================

  private isCircuitBreakerOpen(nodeType: string): boolean {
    const state = this.circuitBreakers.get(nodeType);
    if (!state) return false;

    if (state.state === 'open') {
      if (Date.now() >= state.nextRetryAt) {
        state.state = 'half-open';
        return false;
      }
      return true;
    }

    return false;
  }

  private recordCircuitBreakerFailure(nodeType: string) {
    let state = this.circuitBreakers.get(nodeType);
    if (!state) {
      state = { failures: 0, lastFailure: 0, state: 'closed', nextRetryAt: 0 };
      this.circuitBreakers.set(nodeType, state);
    }

    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'open';
      state.nextRetryAt = Date.now() + CIRCUIT_BREAKER_RESET_MS;
      this.logger.warn(`Circuit breaker opened for ${nodeType} after ${state.failures} failures`);
    }
  }

  private resetCircuitBreaker(nodeType: string) {
    const state = this.circuitBreakers.get(nodeType);
    if (state) {
      if (state.state === 'half-open') {
        this.logger.log(`Circuit breaker closed for ${nodeType}`);
      }
      state.failures = 0;
      state.state = 'closed';
    }
  }

  // ============================================================================
  // RATE LIMITING
  // ============================================================================

  private async waitForRateLimit(credentialId: string, config?: { requestsPerSecond?: number }) {
    if (!config?.requestsPerSecond) return;

    const key = `ratelimit:${credentialId}`;
    let limiter = this.rateLimiters.get(key);

    if (!limiter) {
      limiter = { tokens: config.requestsPerSecond, lastRefill: Date.now() };
      this.rateLimiters.set(key, limiter);
    }

    // Refill tokens
    const now = Date.now();
    const elapsed = (now - limiter.lastRefill) / 1000;
    limiter.tokens = Math.min(config.requestsPerSecond, limiter.tokens + elapsed * config.requestsPerSecond);
    limiter.lastRefill = now;

    // Wait if no tokens available
    while (limiter.tokens < 1) {
      const waitTime = (1 - limiter.tokens) / config.requestsPerSecond * 1000;
      await this.sleep(Math.min(waitTime, 1000));

      const newNow = Date.now();
      const newElapsed = (newNow - limiter.lastRefill) / 1000;
      limiter.tokens = Math.min(config.requestsPerSecond, limiter.tokens + newElapsed * config.requestsPerSecond);
      limiter.lastRefill = newNow;
    }

    limiter.tokens--;
  }

  // ============================================================================
  // CHECKPOINTS
  // ============================================================================

  private async saveCheckpoint(
    executionId: string,
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
  ) {
    const checkpoint: ExecutionCheckpoint = {
      executionId,
      nodeId: [...executedNodes].pop() || '',
      nodeOutputs: Object.fromEntries(nodeOutputs),
      executedNodes: [...executedNodes],
      timestamp: Date.now(),
    };

    await this.redis.set(`checkpoint:${executionId}`, checkpoint, 86400); // 24h TTL
    this.logger.debug(`Saved checkpoint for execution ${executionId} at node ${checkpoint.nodeId}`);
  }

  private async restoreFromCheckpoint(
    executionId: string,
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
  ) {
    const checkpoint = await this.redis.get<ExecutionCheckpoint>(`checkpoint:${executionId}`);
    if (!checkpoint) {
      this.logger.warn(`No checkpoint found for execution ${executionId}`);
      return;
    }

    for (const [key, value] of Object.entries(checkpoint.nodeOutputs)) {
      nodeOutputs.set(key, value);
    }

    for (const nodeId of checkpoint.executedNodes) {
      executedNodes.add(nodeId);
    }

    this.logger.log(
      `Restored checkpoint for execution ${executionId}, ${executedNodes.size} nodes already executed`,
    );
  }

  private async deleteCheckpoint(executionId: string) {
    await this.redis.del(`checkpoint:${executionId}`);
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private extractWorkflowVariables(graph: WorkflowGraph): Record<string, any> {
    const workflowVariables: Record<string, any> = {};
    const graphWithVars = graph as WorkflowGraph & {
      variables?: Array<{ name: string; value: string; type: string }>;
    };

    if (graphWithVars.variables && Array.isArray(graphWithVars.variables)) {
      for (const variable of graphWithVars.variables) {
        let value: any = variable.value;
        if (variable.type === 'number') {
          value = Number(variable.value);
        } else if (variable.type === 'boolean') {
          value = variable.value === 'true';
        } else if (variable.type === 'json') {
          try {
            value = JSON.parse(variable.value);
          } catch {
            // Keep as string
          }
        }
        workflowVariables[variable.name] = value;
      }
    }

    return workflowVariables;
  }

  private collectCredentialIds(nodes: any[]): string[] {
    const credentialIds = new Set<string>();
    for (const node of nodes) {
      const nodeData = node.data || {};
      if (nodeData.credentialId) {
        credentialIds.add(nodeData.credentialId);
      }
      if (nodeData.credentials && Array.isArray(nodeData.credentials)) {
        for (const credId of nodeData.credentials) {
          credentialIds.add(credId);
        }
      }
    }
    return Array.from(credentialIds);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldExecuteNode(
    nodeId: string,
    edges: WorkflowGraph['edges'],
    nodeOutputs: Map<string, any>,
    executedNodes: Set<string>,
  ): boolean {
    const incomingEdges = edges.filter((e) => e.target === nodeId);

    if (incomingEdges.length === 0) {
      return true;
    }

    for (const edge of incomingEdges) {
      const sourceExecuted = executedNodes.has(edge.source);
      const sourceOutput = nodeOutputs.get(edge.source);

      if (!sourceExecuted) {
        continue;
      }

      if (!sourceOutput) {
        return true;
      }

      const edgeSourceHandle = edge.sourceHandle || 'output';
      const nodeOutputHandle = sourceOutput.outputHandle || 'output';

      if (
        edgeSourceHandle === nodeOutputHandle ||
        edgeSourceHandle === 'output' ||
        !edge.sourceHandle
      ) {
        return true;
      }
    }

    return false;
  }

  private gatherPreviousData(
    nodeId: string,
    edges: WorkflowGraph['edges'],
    nodeOutputs: Map<string, any>,
  ): Record<string, any> {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    const previousData: Record<string, any> = {};

    for (const edge of incomingEdges) {
      const sourceOutput = nodeOutputs.get(edge.source);
      if (sourceOutput !== undefined) {
        const edgeSourceHandle = edge.sourceHandle || 'output';
        const nodeOutputHandle = sourceOutput.outputHandle || 'output';

        if (edgeSourceHandle === nodeOutputHandle || !edge.sourceHandle) {
          const data =
            sourceOutput.data !== undefined
              ? sourceOutput.data
              : sourceOutput.__rawOutput || sourceOutput;
          previousData[edge.source] = data;
        }
      }
    }

    return Object.values(previousData).reduce((acc, data) => {
      if (typeof data === 'object' && data !== null) {
        return { ...acc, ...data };
      }
      return acc;
    }, {});
  }

  private resolveExpressions(
    config: Record<string, any>,
    context: Record<string, any>,
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        resolved[key] = this.evaluateExpression(value, context);
      } else if (Array.isArray(value)) {
        resolved[key] = value.map((item) =>
          typeof item === 'string'
            ? this.evaluateExpression(item, context)
            : typeof item === 'object' && item !== null
              ? this.resolveExpressions(item, context)
              : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveExpressions(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private evaluateExpression(template: string, context: Record<string, any>): any {
    const expressionRegex = /\{\{\s*(.+?)\s*\}\}/g;

    const fullMatch = template.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (fullMatch) {
      try {
        const fn = new Function(...Object.keys(context), `return ${fullMatch[1]}`);
        return fn(...Object.values(context));
      } catch {
        return template;
      }
    }

    return template.replace(expressionRegex, (_, expr) => {
      try {
        const fn = new Function(...Object.keys(context), `return ${expr}`);
        const result = fn(...Object.values(context));
        return String(result);
      } catch {
        return `{{${expr}}}`;
      }
    });
  }

  private createLogger(executionId: string, nodeId: string) {
    return {
      debug: (message: string, data?: Record<string, unknown>) => {
        this.logger.debug(`[${executionId}][${nodeId}] ${message}`, data);
      },
      info: (message: string, data?: Record<string, unknown>) => {
        this.logger.log(`[${executionId}][${nodeId}] ${message}`, data);
      },
      warn: (message: string, data?: Record<string, unknown>) => {
        this.logger.warn(`[${executionId}][${nodeId}] ${message}`, data);
      },
      error: (message: string, data?: Record<string, unknown>) => {
        this.logger.error(`[${executionId}][${nodeId}] ${message}`, data);
      },
    };
  }

  private async loadCredentials(
    teamId: string,
    credentialIds: string[],
  ): Promise<Map<string, Record<string, any>>> {
    if (credentialIds.length === 0) {
      return new Map();
    }

    const credentials = await this.prisma.credential.findMany({
      where: {
        id: { in: credentialIds },
        teamId,
      },
    });

    const result = new Map<string, Record<string, any>>();

    for (const credential of credentials) {
      try {
        const decryptedData = this.encryption.decryptObject(credential.data);
        result.set(credential.id, decryptedData);
      } catch (error) {
        this.logger.error(`Failed to decrypt credential ${credential.id}`, error);
      }
    }

    return result;
  }

  private recordExecutionTime(durationMs: number) {
    this.executionTimes.push(durationMs);
    if (this.executionTimes.length > this.maxExecutionTimeSamples) {
      this.executionTimes.shift();
    }
  }

  private calculatePercentile(percentile: number): number {
    if (this.executionTimes.length === 0) return 0;

    const sorted = [...this.executionTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  async cancelExecution(executionId: string): Promise<boolean> {
    const controller = this.activeExecutions.get(executionId);
    if (controller) {
      controller.abort();
      return true;
    }

    await this.redis.publish('execution:cancel', { executionId });
    return false;
  }

  async getStats(): Promise<WorkerStats> {
    let queueLength = 0;
    try {
      const regularQueue = await this.redis.llen('workflow:executions');
      const priorityQueue = await this.redis.llen('workflow:executions:priority');
      queueLength = regularQueue + priorityQueue;
    } catch {
      // Ignore error
    }

    const avgExecutionTimeMs =
      this.executionTimes.length > 0
        ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
        : 0;

    let circuitBreakersOpen = 0;
    for (const state of this.circuitBreakers.values()) {
      if (state.state === 'open') circuitBreakersOpen++;
    }

    return {
      isRunning: this.isRunning,
      activeExecutions: this.activeExecutions.size,
      processingCount: this.processingCount,
      maxConcurrent: this.concurrentWorkers,
      totalProcessed: this.totalProcessed,
      totalFailed: this.totalFailed,
      totalCancelled: this.totalCancelled,
      avgExecutionTimeMs,
      p50ExecutionTimeMs: this.calculatePercentile(50),
      p95ExecutionTimeMs: this.calculatePercentile(95),
      p99ExecutionTimeMs: this.calculatePercentile(99),
      queueLength,
      uptime: Date.now() - this.startTime,
      nodesExecutedTotal: this.nodesExecutedTotal,
      circuitBreakersOpen,
    };
  }

  getConfig() {
    return {
      concurrentWorkers: this.concurrentWorkers,
      pollIntervalIdle: this.pollIntervalIdle,
      pollIntervalBusy: this.pollIntervalBusy,
      batchSize: this.batchSize,
      gracefulShutdownTimeoutMs: this.gracefulShutdownTimeoutMs,
      enableParallelBranches: this.enableParallelBranches,
      enableCheckpoints: this.enableCheckpoints,
    };
  }

  // ============================================================================
  // SUB-WORKFLOW EXECUTION
  // ============================================================================

  /**
   * Execute a sub-workflow inline and wait for completion
   */
  private async executeSubWorkflow(
    resultData: Record<string, unknown>,
    parentExecutionId: string,
    parentWorkflowId: string,
    parentSettings: Record<string, any> | undefined,
    abortController: AbortController,
  ): Promise<Record<string, unknown>> {
    const subWorkflowId = resultData.subWorkflowId as string;
    const inputData = resultData.inputData as Record<string, unknown> || {};
    const versionPinned = resultData.versionPinned as boolean;
    const pinnedVersion = resultData.pinnedVersion as number | undefined;
    const waitForCompletion = resultData.waitForCompletion !== false;
    const timeout = (resultData.timeout as number) || 300000; // 5 minutes default

    this.logger.log(
      `Executing sub-workflow ${subWorkflowId} from parent execution ${parentExecutionId}`,
    );

    // Load sub-workflow definition
    const subWorkflow = await this.prisma.subWorkflow.findFirst({
      where: versionPinned && pinnedVersion
        ? {
            id: subWorkflowId,
            version: pinnedVersion,
          }
        : {
            id: subWorkflowId,
            isLatest: true,
          },
      include: {
        workflow: true,
      },
    });

    if (!subWorkflow) {
      throw new Error(`Sub-workflow not found: ${subWorkflowId}`);
    }

    // Get the workflow graph
    const workflow = subWorkflow.workflow;
    if (!workflow) {
      throw new Error(`Workflow not found for sub-workflow: ${subWorkflowId}`);
    }

    const graph = workflow.graph as unknown as WorkflowGraph;

    // Find the SubWorkflowInput node and set its data
    const inputNode = graph.nodes.find(
      (n) => (n as any).data?.nodeType === 'flow.subworkflow-input',
    );
    if (inputNode) {
      (inputNode as any).data = {
        ...(inputNode as any).data,
        __inputData: inputData,
      };
    }

    // Create child execution record
    const childExecution = await this.prisma.execution.create({
      data: {
        workflowId: workflow.id,
        triggeredBy: null,
        triggerType: 'SUBWORKFLOW',
        status: 'PENDING',
        inputData: inputData as any,
        parentExecutionId,
      },
    });

    this.logger.log(`Created child execution ${childExecution.id} for sub-workflow`);

    if (!waitForCompletion) {
      // Fire and forget - queue the execution and return immediately
      await this.redis.lpush('workflow:executions:priority', {
        executionId: childExecution.id,
        workflowId: workflow.id,
        teamId: workflow.teamId,
        graph,
        inputData,
        settings: workflow.settings,
        parentExecutionId,
        priority: 1,
      });

      return {
        executionId: childExecution.id,
        status: 'queued',
      };
    }

    // Execute inline and wait for completion
    const childAbortController = new AbortController();

    // Link abort to parent
    const abortHandler = () => childAbortController.abort();
    abortController.signal.addEventListener('abort', abortHandler, { once: true });

    try {
      // Update status to running
      await this.prisma.execution.update({
        where: { id: childExecution.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // Initialize execution state
      const nodeOutputs = new Map<string, any>();
      const executedNodes = new Set<string>();

      // Set trigger data
      nodeOutputs.set('$trigger', inputData);
      nodeOutputs.set('$input', inputData);

      // Extract workflow variables
      const workflowVariables = this.extractWorkflowVariables(graph);

      // Collect and load credentials
      const credentialIds = this.collectCredentialIds(graph.nodes);
      const credentials = await this.loadCredentials(workflow.teamId, credentialIds);

      // Build execution graph for parallel processing
      const executionGraph = this.buildExecutionGraph(graph);

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Sub-workflow execution timed out after ${timeout}ms`)), timeout);
      });

      // Execute the sub-workflow
      await Promise.race([
        this.executeWithParallelBranches(
          executionGraph,
          childExecution.id,
          workflow.id,
          graph,
          nodeOutputs,
          executedNodes,
          credentials,
          workflowVariables,
          inputData as Record<string, any>,
          parentSettings,
          childAbortController,
        ),
        timeoutPromise,
      ]);

      // Find the SubWorkflowOutput node and get its data
      const outputNode = graph.nodes.find(
        (n) => (n as any).data?.nodeType === 'flow.subworkflow-output',
      );

      let outputData: Record<string, unknown> = {};
      if (outputNode) {
        const output = nodeOutputs.get(outputNode.id);
        outputData = output?.data || output?.__rawOutput || {};
      } else {
        // Fallback to last executed node
        const lastExecutedNode = [...executedNodes].pop();
        if (lastExecutedNode) {
          const output = nodeOutputs.get(lastExecutedNode);
          outputData = output?.data || output?.__rawOutput || {};
        }
      }

      // Update execution status
      await this.prisma.execution.update({
        where: { id: childExecution.id },
        data: {
          status: 'COMPLETED',
          outputData: outputData as any,
          finishedAt: new Date(),
        },
      });

      this.logger.log(`Sub-workflow execution ${childExecution.id} completed`);

      return {
        executionId: childExecution.id,
        status: 'completed',
        ...outputData,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.prisma.execution.update({
        where: { id: childExecution.id },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt: new Date(),
        },
      });

      this.logger.error(`Sub-workflow execution ${childExecution.id} failed: ${errorMessage}`);

      throw new Error(`Sub-workflow execution failed: ${errorMessage}`);
    } finally {
      abortController.signal.removeEventListener('abort', abortHandler);
    }
  }

  // Sub-workflow support (async queued execution)
  async triggerSubWorkflow(
    workflowId: string,
    parentExecutionId: string,
    inputData: Record<string, any>,
    teamId: string,
  ): Promise<string> {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error(`Sub-workflow not found: ${workflowId}`);
    }

    const execution = await this.prisma.execution.create({
      data: {
        workflowId,
        triggeredBy: null,
        triggerType: 'SUBWORKFLOW',
        status: 'PENDING',
        inputData,
      },
    });

    await this.redis.lpush('workflow:executions:priority', {
      executionId: execution.id,
      workflowId,
      teamId,
      graph: workflow.graph,
      inputData,
      settings: workflow.settings,
      parentExecutionId,
      priority: 1,
    });

    return execution.id;
  }
}
