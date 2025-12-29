import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';

// Debug session states
export type DebugState = 'idle' | 'running' | 'paused' | 'stepping' | 'finished' | 'error';

// Step modes for execution control
export type StepMode = 'continue' | 'step-over' | 'step-into' | 'step-out';

// Breakpoint types
export interface Breakpoint {
  id: string;
  nodeId: string;
  enabled: boolean;
  condition?: string; // JavaScript expression to evaluate
  hitCount?: number; // Break after N hits
  logMessage?: string; // Log message instead of breaking
  currentHits: number;
}

// Node execution data
export interface NodeDebugData {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: any;
  output?: any;
  error?: string;
  startedAt: Date;
  finishedAt?: Date;
  duration?: number;
}

// Debug session
export interface DebugSession {
  id: string;
  executionId: string;
  workflowId: string;
  userId: string;
  state: DebugState;
  breakpoints: Breakpoint[];
  currentNodeId: string | null;
  stepMode: StepMode;
  callStack: string[];
  nodeData: Record<string, NodeDebugData>;
  variables: Record<string, any>;
  modifiedData: Record<string, any>; // Data modifications by user
  startedAt: Date;
  pausedAt?: Date;
}

// In-memory storage for active debug sessions
const activeSessions = new Map<string, DebugSession>();

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start a debug session for a workflow execution
   */
  async startDebugSession(
    executionId: string,
    workflowId: string,
    userId: string,
    breakpoints: Omit<Breakpoint, 'id' | 'currentHits'>[] = [],
  ): Promise<DebugSession> {
    // Check if session already exists
    const existingSession = this.getSessionByExecution(executionId);
    if (existingSession) {
      throw new BadRequestException('Debug session already exists for this execution');
    }

    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: DebugSession = {
      id: sessionId,
      executionId,
      workflowId,
      userId,
      state: 'idle',
      breakpoints: breakpoints.map((bp, i) => ({
        ...bp,
        id: `bp-${i}-${Date.now()}`,
        currentHits: 0,
      })),
      currentNodeId: null,
      stepMode: 'continue',
      callStack: [],
      nodeData: {},
      variables: {},
      modifiedData: {},
      startedAt: new Date(),
    };

    activeSessions.set(sessionId, session);
    this.logger.log(`Started debug session ${sessionId} for execution ${executionId}`);

    return session;
  }

  /**
   * Get a debug session by ID
   */
  getSession(sessionId: string): DebugSession | undefined {
    return activeSessions.get(sessionId);
  }

  /**
   * Get session by execution ID
   */
  getSessionByExecution(executionId: string): DebugSession | undefined {
    for (const session of activeSessions.values()) {
      if (session.executionId === executionId) {
        return session;
      }
    }
    return undefined;
  }

  /**
   * Add a breakpoint to a session
   */
  addBreakpoint(
    sessionId: string,
    nodeId: string,
    options?: {
      condition?: string;
      hitCount?: number;
      logMessage?: string;
    },
  ): Breakpoint {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    const breakpoint: Breakpoint = {
      id: `bp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      enabled: true,
      condition: options?.condition,
      hitCount: options?.hitCount,
      logMessage: options?.logMessage,
      currentHits: 0,
    };

    session.breakpoints.push(breakpoint);
    this.emitSessionUpdate(session);

    return breakpoint;
  }

  /**
   * Remove a breakpoint
   */
  removeBreakpoint(sessionId: string, breakpointId: string): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    session.breakpoints = session.breakpoints.filter((bp) => bp.id !== breakpointId);
    this.emitSessionUpdate(session);
  }

  /**
   * Toggle breakpoint enabled state
   */
  toggleBreakpoint(sessionId: string, breakpointId: string): Breakpoint {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    const breakpoint = session.breakpoints.find((bp) => bp.id === breakpointId);
    if (!breakpoint) {
      throw new NotFoundException('Breakpoint not found');
    }

    breakpoint.enabled = !breakpoint.enabled;
    this.emitSessionUpdate(session);

    return breakpoint;
  }

  /**
   * Check if execution should pause at a node
   */
  async shouldPauseAtNode(
    sessionId: string,
    nodeId: string,
    nodeData: any,
  ): Promise<{ shouldPause: boolean; reason?: string; logMessage?: string }> {
    const session = this.getSession(sessionId);
    if (!session) {
      return { shouldPause: false };
    }

    // Check if stepping
    if (session.state === 'stepping') {
      return { shouldPause: true, reason: 'step' };
    }

    // Check breakpoints
    const breakpoint = session.breakpoints.find(
      (bp) => bp.nodeId === nodeId && bp.enabled,
    );

    if (!breakpoint) {
      return { shouldPause: false };
    }

    // Check hit count
    breakpoint.currentHits++;
    if (breakpoint.hitCount && breakpoint.currentHits < breakpoint.hitCount) {
      return { shouldPause: false };
    }

    // Check condition
    if (breakpoint.condition) {
      try {
        const conditionMet = this.evaluateCondition(breakpoint.condition, nodeData);
        if (!conditionMet) {
          return { shouldPause: false };
        }
      } catch (error) {
        this.logger.warn(`Breakpoint condition error: ${error}`);
      }
    }

    // Log message breakpoint
    if (breakpoint.logMessage) {
      return {
        shouldPause: false,
        logMessage: this.interpolateMessage(breakpoint.logMessage, nodeData),
      };
    }

    return { shouldPause: true, reason: 'breakpoint' };
  }

  /**
   * Pause execution at a node
   */
  pauseAtNode(sessionId: string, nodeId: string, nodeData: NodeDebugData): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    session.state = 'paused';
    session.currentNodeId = nodeId;
    session.pausedAt = new Date();
    session.nodeData[nodeId] = nodeData;
    session.callStack.push(nodeId);

    this.emitSessionUpdate(session);
    this.eventEmitter.emit('debug.paused', {
      sessionId,
      nodeId,
      nodeData,
    });
  }

  /**
   * Resume execution
   */
  resume(sessionId: string, mode: StepMode = 'continue'): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    if (session.state !== 'paused') {
      throw new BadRequestException('Session is not paused');
    }

    session.stepMode = mode;
    session.state = mode === 'continue' ? 'running' : 'stepping';
    session.pausedAt = undefined;

    this.emitSessionUpdate(session);
    this.eventEmitter.emit('debug.resumed', {
      sessionId,
      mode,
    });
  }

  /**
   * Step over - execute current node and pause at next
   */
  stepOver(sessionId: string): void {
    this.resume(sessionId, 'step-over');
  }

  /**
   * Step into - step into sub-workflow if present
   */
  stepInto(sessionId: string): void {
    this.resume(sessionId, 'step-into');
  }

  /**
   * Step out - execute until returning from current sub-workflow
   */
  stepOut(sessionId: string): void {
    this.resume(sessionId, 'step-out');
  }

  /**
   * Record node execution data
   */
  recordNodeExecution(sessionId: string, nodeData: NodeDebugData): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.nodeData[nodeData.nodeId] = nodeData;
    this.emitSessionUpdate(session);
  }

  /**
   * Modify data during debugging
   */
  modifyData(
    sessionId: string,
    nodeId: string,
    path: string,
    value: any,
  ): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    if (session.state !== 'paused') {
      throw new BadRequestException('Can only modify data when paused');
    }

    // Store modification
    if (!session.modifiedData[nodeId]) {
      session.modifiedData[nodeId] = {};
    }
    session.modifiedData[nodeId][path] = value;

    // Apply to current node data
    const nodeData = session.nodeData[nodeId];
    if (nodeData) {
      this.setNestedValue(nodeData.input, path, value);
    }

    this.emitSessionUpdate(session);
    this.logger.log(`Modified data at ${nodeId}.${path}`);
  }

  /**
   * Get modified data for a node
   */
  getModifiedData(sessionId: string, nodeId: string): Record<string, any> | undefined {
    const session = this.getSession(sessionId);
    if (!session) return undefined;

    return session.modifiedData[nodeId];
  }

  /**
   * Set a watch expression
   */
  setVariable(sessionId: string, name: string, value: any): void {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Debug session not found');
    }

    session.variables[name] = value;
    this.emitSessionUpdate(session);
  }

  /**
   * End a debug session
   */
  endSession(sessionId: string, state: 'finished' | 'error' = 'finished'): void {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.state = state;
    this.emitSessionUpdate(session);

    // Archive session data
    this.archiveSession(session);

    // Remove from active sessions after a delay
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 60000); // Keep for 1 minute for final reads

    this.logger.log(`Ended debug session ${sessionId} with state ${state}`);
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): DebugSession[] {
    const sessions: DebugSession[] = [];
    for (const session of activeSessions.values()) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Replay an execution with optional data modifications
   */
  async replayExecution(
    executionId: string,
    userId: string,
    modifications?: Record<string, any>,
  ): Promise<{ replayExecutionId: string; debugSessionId: string }> {
    // Get original execution
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: {
        nodeLogs: true,
      },
    });

    if (!execution) {
      throw new NotFoundException('Execution not found');
    }

    // Create a new execution for replay
    const baseInputData = (execution.inputData as Record<string, unknown>) || {};
    const replayExecution = await this.prisma.execution.create({
      data: {
        workflowId: execution.workflowId,
        triggeredBy: userId,
        triggerType: 'MANUAL',
        status: 'PENDING',
        inputData: modifications
          ? { ...baseInputData, ...modifications }
          : execution.inputData ?? Prisma.JsonNull,
        metadata: {
          isReplay: true,
          originalExecutionId: executionId,
          modifications: modifications ?? null,
        },
      },
    });

    // Start debug session
    const session = await this.startDebugSession(
      replayExecution.id,
      execution.workflowId,
      userId,
    );

    this.logger.log(
      `Started replay of execution ${executionId} as ${replayExecution.id}`,
    );

    return {
      replayExecutionId: replayExecution.id,
      debugSessionId: session.id,
    };
  }

  /**
   * Get execution history for replay selection
   */
  async getReplayableExecutions(workflowId: string, limit = 20) {
    return this.prisma.execution.findMany({
      where: {
        workflowId,
        status: { in: ['COMPLETED', 'FAILED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        triggerType: true,
        startedAt: true,
        finishedAt: true,
        duration: true,
        inputData: true,
        metadata: true,
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private evaluateCondition(condition: string, data: any): boolean {
    try {
      // Create a safe evaluation context
      const context = {
        input: data.input || {},
        output: data.output || {},
        error: data.error,
        nodeId: data.nodeId,
        nodeName: data.nodeName,
        nodeType: data.nodeType,
      };

      // Simple expression evaluation (for security, use a proper expression parser in production)
      const fn = new Function(...Object.keys(context), `return (${condition})`);
      return !!fn(...Object.values(context));
    } catch {
      return false;
    }
  }

  private interpolateMessage(message: string, data: any): string {
    return message.replace(/\{([^}]+)\}/g, (_, path) => {
      try {
        const value = this.getNestedValue(data, path);
        return typeof value === 'object' ? JSON.stringify(value) : String(value);
      } catch {
        return `{${path}}`;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined) {
        current[key] = {};
      }
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  private emitSessionUpdate(session: DebugSession): void {
    this.eventEmitter.emit('debug.session.updated', {
      sessionId: session.id,
      session,
    });
  }

  private async archiveSession(session: DebugSession): Promise<void> {
    // Store session data in execution metadata for later analysis
    try {
      // Serialize to JSON to ensure valid structure (converts Dates, removes class instances)
      const sessionData = JSON.parse(JSON.stringify({
        debugSession: {
          id: session.id,
          breakpoints: session.breakpoints,
          nodeData: session.nodeData,
          modifiedData: session.modifiedData,
          duration: Date.now() - session.startedAt.getTime(),
        },
      })) as Prisma.InputJsonValue;

      await this.prisma.execution.update({
        where: { id: session.executionId },
        data: {
          metadata: sessionData,
        },
      });
    } catch (error) {
      this.logger.warn(`Failed to archive debug session: ${error}`);
    }
  }
}
