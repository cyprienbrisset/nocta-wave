import { getNode } from '@ws-flows/nodes';
import type { WorkflowGraph, NodeContext } from '@ws-flows/shared';
import { topologicalSort } from '@ws-flows/shared';
import { db } from '../services/database.service';
import { cache } from '../services/redis.service';
import { decryptObject } from '../services/encryption.service';
import { evaluateExpression } from './expression-evaluator';

export interface ExecutionInput {
  executionId: string;
  workflowId: string;
  teamId: string;
  graph: WorkflowGraph;
  inputData: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  outputData: Record<string, any>;
  error?: string;
  duration: number;
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(input: ExecutionInput): Promise<ExecutionResult> {
  const startTime = Date.now();
  const { executionId, teamId, graph, inputData } = input;

  // Update status to running
  await db.updateExecutionStatus(executionId, 'RUNNING', {
    startedAt: new Date(),
  });

  await publishEvent('execution:started', {
    executionId,
    workflowId: input.workflowId,
    teamId,
  });

  try {
    // Get execution order using topological sort
    const executionOrder = topologicalSort(graph.nodes, graph.edges);

    // Store node outputs for reference by downstream nodes
    const nodeOutputs: Map<string, any> = new Map();

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

    // Get required credentials
    const credentialIds = new Set<string>();
    for (const node of graph.nodes) {
      if (node.data.credentials && node.data.credentials.length > 0) {
        for (const credId of node.data.credentials) {
          credentialIds.add(credId);
        }
      }
    }

    // Load and decrypt credentials
    const credentials = await loadCredentials(teamId, Array.from(credentialIds));

    // Execute nodes in order
    for (const node of executionOrder) {
      if (!node) continue;

      const nodeDefinition = getNode(node.type);
      if (!nodeDefinition) {
        throw new Error(`Unknown node type: ${node.type}`);
      }

      // Create node log
      const nodeLog = await db.createNodeLog({
        executionId,
        nodeId: node.id,
        nodeType: node.type,
        nodeName: node.data.label,
        status: 'RUNNING',
        inputData: node.data.config,
      });

      await publishEvent('execution:node:started', {
        executionId,
        nodeId: node.id,
        nodeName: node.data.label,
        nodeType: node.type,
      });

      const nodeStartTime = Date.now();

      try {
        // Gather input data from previous nodes
        const previousData = gatherPreviousData(node.id, graph.edges, nodeOutputs);

        // Resolve expressions in config
        const resolvedConfig = resolveExpressions(node.data.config || {}, {
          $trigger: inputData,
          $input: inputData,
          $nodes: Object.fromEntries(nodeOutputs),
          $env: process.env,
          variables: workflowVariables,
          workflow: {
            id: input.workflowId,
            name: input.settings?.name || '',
          },
          execution: {
            id: executionId,
            timestamp: new Date().toISOString(),
          },
        });

        // Get node credentials (use first credential if available)
        const nodeCredentialId = node.data.credentials && node.data.credentials.length > 0
          ? node.data.credentials[0]
          : undefined;
        const nodeCredentials = nodeCredentialId
          ? credentials.get(nodeCredentialId)
          : undefined;

        // Create execution context
        const context: NodeContext = {
          logger: createLogger(executionId, node.id),
          executionId,
          workflowId: input.workflowId,
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

        // Store output
        nodeOutputs.set(node.id, result.data);

        const nodeDuration = Date.now() - nodeStartTime;

        // Update node log
        await db.updateNodeLog(nodeLog.id, {
          status: 'COMPLETED',
          outputData: result.data,
          finishedAt: new Date(),
          duration: nodeDuration,
        });

        await publishEvent('execution:node:completed', {
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

        await db.updateNodeLog(nodeLog.id, {
          status: 'FAILED',
          error: errorMessage,
          finishedAt: new Date(),
          duration: nodeDuration,
        });

        await publishEvent('execution:node:failed', {
          executionId,
          nodeId: node.id,
          nodeName: node.data.label,
          error: errorMessage,
        });

        throw error;
      }
    }

    const duration = Date.now() - startTime;

    // Get final output (from last node)
    const lastNode = executionOrder[executionOrder.length - 1];
    const outputData = lastNode ? nodeOutputs.get(lastNode.id) || {} : {};

    await db.updateExecutionStatus(executionId, 'COMPLETED', {
      outputData,
      finishedAt: new Date(),
      duration,
    });

    await publishEvent('execution:completed', {
      executionId,
      workflowId: input.workflowId,
      teamId,
      outputData,
      duration,
    });

    return {
      success: true,
      outputData,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db.updateExecutionStatus(executionId, 'FAILED', {
      errorMessage,
      finishedAt: new Date(),
      duration,
    });

    await publishEvent('execution:failed', {
      executionId,
      workflowId: input.workflowId,
      teamId,
      error: errorMessage,
      duration,
    });

    return {
      success: false,
      outputData: {},
      error: errorMessage,
      duration,
    };
  }
}

/**
 * Load and decrypt credentials
 */
async function loadCredentials(
  teamId: string,
  credentialIds: string[],
): Promise<Map<string, Record<string, any>>> {
  if (credentialIds.length === 0) {
    return new Map();
  }

  const credentials = await db.getCredentials(teamId, credentialIds);
  const result = new Map<string, Record<string, any>>();

  for (const credential of credentials) {
    const decryptedData = decryptObject(credential.data);
    result.set(credential.id, decryptedData);
  }

  return result;
}

/**
 * Gather data from previous nodes
 */
function gatherPreviousData(
  nodeId: string,
  edges: WorkflowGraph['edges'],
  nodeOutputs: Map<string, any>,
): Record<string, any> {
  const incomingEdges = edges.filter((e) => e.target === nodeId);
  const previousData: Record<string, any> = {};

  for (const edge of incomingEdges) {
    const sourceOutput = nodeOutputs.get(edge.source);
    if (sourceOutput !== undefined) {
      previousData[edge.source] = sourceOutput;
    }
  }

  // Merge all previous outputs into a single object
  return Object.values(previousData).reduce((acc, data) => {
    return { ...acc, ...data };
  }, {});
}

/**
 * Resolve expressions in config
 */
function resolveExpressions(
  config: Record<string, any>,
  context: Record<string, any>,
): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(config)) {
    if (typeof value === 'string') {
      resolved[key] = evaluateExpression(value, context);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      resolved[key] = resolveExpressions(value, context);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Create a logger for node execution
 */
function createLogger(executionId: string, nodeId: string) {
  return {
    debug: (message: string, ...args: any[]) => {
      console.debug(`[${executionId}][${nodeId}] ${message}`, ...args);
    },
    info: (message: string, ...args: any[]) => {
      console.info(`[${executionId}][${nodeId}] ${message}`, ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(`[${executionId}][${nodeId}] ${message}`, ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(`[${executionId}][${nodeId}] ${message}`, ...args);
    },
  };
}

/**
 * Publish event to Redis
 */
async function publishEvent(channel: string, data: any): Promise<void> {
  await cache.publish(channel, data);
}
