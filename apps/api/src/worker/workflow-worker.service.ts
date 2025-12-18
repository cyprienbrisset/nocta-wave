import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../database/redis.service';
import { EncryptionService } from '../modules/credential/encryption.service';
import { getNode } from '@ws-flows/nodes';
import { topologicalSort } from '@ws-flows/shared';
import type { WorkflowGraph, NodeContext } from '@ws-flows/shared';

interface ExecutionJob {
  executionId: string;
  workflowId: string;
  teamId: string;
  graph: WorkflowGraph;
  inputData?: Record<string, any>;
  settings?: Record<string, any>;
}

@Injectable()
export class WorkflowWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowWorkerService.name);
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private encryption: EncryptionService,
  ) {}

  onModuleInit() {
    this.startPolling();
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  private startPolling() {
    this.isRunning = true;
    this.logger.log('Starting workflow worker...');
    this.poll();
  }

  private stopPolling() {
    this.isRunning = false;
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
    }
    this.logger.log('Workflow worker stopped');
  }

  private async poll() {
    if (!this.isRunning) return;

    try {
      // Try to get a job from the queue
      const jobData = await this.redis.rpop<ExecutionJob>('workflow:executions');

      if (jobData) {
        this.logger.log(`Processing execution: ${jobData.executionId}`);
        await this.processExecution(jobData);
      }
    } catch (error) {
      this.logger.error('Error polling for jobs', error);
    }

    // Schedule next poll
    this.pollInterval = setTimeout(() => this.poll(), 1000);
  }

  private async processExecution(job: ExecutionJob) {
    const { executionId, workflowId, teamId, graph, inputData = {}, settings } = job;
    const startTime = Date.now();

    try {
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

      // Get execution order
      const executionOrder = topologicalSort(graph.nodes, graph.edges);
      const nodeOutputs = new Map<string, any>();

      // Set trigger data
      nodeOutputs.set('$trigger', inputData);
      nodeOutputs.set('$input', inputData);

      // Extract workflow variables from graph
      const workflowVariables: Record<string, any> = {};
      const graphWithVars = graph as WorkflowGraph & { variables?: Array<{ name: string; value: string; type: string }> };
      if (graphWithVars.variables && Array.isArray(graphWithVars.variables)) {
        for (const variable of graphWithVars.variables) {
          let value: any = variable.value;
          // Parse value based on type
          if (variable.type === 'number') {
            value = Number(variable.value);
          } else if (variable.type === 'boolean') {
            value = variable.value === 'true';
          } else if (variable.type === 'json') {
            try {
              value = JSON.parse(variable.value);
            } catch {
              // Keep as string if invalid JSON
            }
          }
          workflowVariables[variable.name] = value;
        }
      }

      // Collect all credential IDs from nodes
      const credentialIds = new Set<string>();
      for (const node of graph.nodes) {
        const nodeData = node.data as any;
        // Support both credentialId (single) and credentials (array) formats
        if (nodeData.credentialId) {
          credentialIds.add(nodeData.credentialId);
        }
        if (nodeData.credentials && Array.isArray(nodeData.credentials)) {
          for (const credId of nodeData.credentials) {
            credentialIds.add(credId);
          }
        }
      }

      // Load and decrypt credentials
      const credentials = await this.loadCredentials(teamId, Array.from(credentialIds));

      // Execute nodes in order
      for (const node of executionOrder) {
        if (!node) continue;

        // Get node type from data.nodeType (set by frontend) or from node.type
        const nodeType = (node.data as any).nodeType || node.type;
        const nodeDefinition = getNode(nodeType);
        if (!nodeDefinition) {
          throw new Error(`Unknown node type: ${nodeType}`);
        }

        // Create execution log entry
        const executionLog = await this.prisma.executionLog.create({
          data: {
            executionId,
            nodeId: node.id,
            nodeType,
            nodeName: node.data.label,
            status: 'RUNNING',
            inputData: (node.data.config || {}) as any,
          },
        });

        await this.redis.publish('execution:node:started', {
          executionId,
          nodeId: node.id,
          nodeName: node.data.label,
        });

        const nodeStartTime = Date.now();

        try {
          // Gather input data from previous nodes
          const previousData = this.gatherPreviousData(node.id, graph.edges, nodeOutputs);

          // Resolve expressions in config
          const resolvedConfig = this.resolveExpressions(node.data.config || {}, {
            $trigger: inputData,
            $input: inputData,
            $nodes: Object.fromEntries(nodeOutputs),
            $env: process.env,
            variables: workflowVariables,
            workflow: {
              id: workflowId,
              name: settings?.name || '',
            },
            execution: {
              id: executionId,
              timestamp: new Date().toISOString(),
            },
          });

          // Get node credentials
          const nodeData = node.data as any;
          const credentialId = nodeData.credentialId || (nodeData.credentials && nodeData.credentials[0]);
          const nodeCredentials = credentialId ? credentials.get(credentialId) : undefined;

          // Create execution context
          const context: NodeContext = {
            logger: this.createLogger(executionId, node.id),
            executionId,
            workflowId,
            nodeId: node.id,
          };

          // Execute node
          const result = await nodeDefinition.runner(
            {
              config: resolvedConfig,
              data: previousData,
              credentials: nodeCredentials,
            },
            context,
          );

          // Store output with output handle info
          const outputData = result.data as Record<string, unknown> | undefined;
          const outputHandle = outputData?.outputHandle as string | undefined;

          // Store the output with handle information
          nodeOutputs.set(node.id, {
            data: outputData?.data !== undefined ? outputData.data : outputData,
            outputHandle: outputHandle || 'output',
            __rawOutput: result.data,
          });

          const nodeDuration = Date.now() - nodeStartTime;

          // Update execution log
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
            nodeName: node.data.label,
            outputData: result.data,
            duration: nodeDuration,
          });

          // Check for stop signal
          const resultData = result.data as Record<string, unknown> | undefined;
          if (resultData?.stop === true) {
            break;
          }
        } catch (error) {
          const nodeDuration = Date.now() - nodeStartTime;
          const errorMessage = error instanceof Error ? error.message : String(error);

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

      const duration = Date.now() - startTime;
      const lastNode = executionOrder[executionOrder.length - 1];
      const outputData = lastNode ? nodeOutputs.get(lastNode.id) || {} : {};

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

      this.logger.log(`Execution ${executionId} completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.prisma.execution.update({
        where: { id: executionId },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt: new Date(),
          duration,
        },
      });

      await this.redis.publish('execution:failed', {
        executionId,
        workflowId,
        error: errorMessage,
        duration,
      });

      this.logger.error(`Execution ${executionId} failed: ${errorMessage}`);
    }
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
        // Check if this edge's sourceHandle matches the node's outputHandle
        const edgeSourceHandle = edge.sourceHandle || 'output';
        const nodeOutputHandle = sourceOutput.outputHandle || 'output';

        // Only include data if the handles match
        if (edgeSourceHandle === nodeOutputHandle) {
          // Use the actual data, not the wrapper object
          const data = sourceOutput.data !== undefined ? sourceOutput.data : sourceOutput.__rawOutput || sourceOutput;
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
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveExpressions(value, context);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  private evaluateExpression(template: string, context: Record<string, any>): any {
    // Match {{ expression }} patterns
    const expressionRegex = /\{\{\s*(.+?)\s*\}\}/g;

    // If the entire string is an expression, return the evaluated value directly
    const fullMatch = template.match(/^\{\{\s*(.+?)\s*\}\}$/);
    if (fullMatch) {
      try {
        const fn = new Function(...Object.keys(context), `return ${fullMatch[1]}`);
        return fn(...Object.values(context));
      } catch {
        return template;
      }
    }

    // Otherwise, replace expressions within the string
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

  /**
   * Load and decrypt credentials for workflow execution
   */
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
}
