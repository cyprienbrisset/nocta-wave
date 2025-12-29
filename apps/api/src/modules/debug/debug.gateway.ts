import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DebugService, DebugSession, StepMode } from './debug.service';

interface DebugClient {
  socket: Socket;
  userId: string;
  sessionIds: Set<string>;
}

@WebSocketGateway({
  namespace: '/debug',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4000',
    credentials: true,
  },
})
export class DebugGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DebugGateway.name);
  private clients = new Map<string, DebugClient>();

  constructor(private debugService: DebugService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Debug client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client.id);
    this.logger.log(`Debug client disconnected: ${client.id}`);
  }

  @SubscribeMessage('auth')
  handleAuth(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.clients.set(client.id, {
      socket: client,
      userId: data.userId,
      sessionIds: new Set(),
    });
    return { success: true };
  }

  @SubscribeMessage('join-session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const debugClient = this.clients.get(client.id);
    if (!debugClient) {
      return { error: 'Not authenticated' };
    }

    const session = this.debugService.getSession(data.sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }

    client.join(`debug:${data.sessionId}`);
    debugClient.sessionIds.add(data.sessionId);

    return { success: true, session };
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const debugClient = this.clients.get(client.id);
    if (debugClient) {
      debugClient.sessionIds.delete(data.sessionId);
    }
    client.leave(`debug:${data.sessionId}`);
    return { success: true };
  }

  @SubscribeMessage('add-breakpoint')
  handleAddBreakpoint(
    @MessageBody()
    data: {
      sessionId: string;
      nodeId: string;
      condition?: string;
      hitCount?: number;
      logMessage?: string;
    },
  ) {
    try {
      const breakpoint = this.debugService.addBreakpoint(data.sessionId, data.nodeId, {
        condition: data.condition,
        hitCount: data.hitCount,
        logMessage: data.logMessage,
      });
      return { success: true, breakpoint };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('remove-breakpoint')
  handleRemoveBreakpoint(
    @MessageBody() data: { sessionId: string; breakpointId: string },
  ) {
    try {
      this.debugService.removeBreakpoint(data.sessionId, data.breakpointId);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('toggle-breakpoint')
  handleToggleBreakpoint(
    @MessageBody() data: { sessionId: string; breakpointId: string },
  ) {
    try {
      const breakpoint = this.debugService.toggleBreakpoint(
        data.sessionId,
        data.breakpointId,
      );
      return { success: true, breakpoint };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('resume')
  handleResume(@MessageBody() data: { sessionId: string; mode?: StepMode }) {
    try {
      this.debugService.resume(data.sessionId, data.mode);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('step-over')
  handleStepOver(@MessageBody() data: { sessionId: string }) {
    try {
      this.debugService.stepOver(data.sessionId);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('step-into')
  handleStepInto(@MessageBody() data: { sessionId: string }) {
    try {
      this.debugService.stepInto(data.sessionId);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('step-out')
  handleStepOut(@MessageBody() data: { sessionId: string }) {
    try {
      this.debugService.stepOut(data.sessionId);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('modify-data')
  handleModifyData(
    @MessageBody() data: { sessionId: string; nodeId: string; path: string; value: any },
  ) {
    try {
      this.debugService.modifyData(data.sessionId, data.nodeId, data.path, data.value);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('end-session')
  handleEndSession(
    @MessageBody() data: { sessionId: string; state?: 'finished' | 'error' },
  ) {
    try {
      this.debugService.endSession(data.sessionId, data.state);
      return { success: true };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Event listeners for broadcasting updates

  @OnEvent('debug.session.updated')
  handleSessionUpdated(payload: { sessionId: string; session: DebugSession }) {
    this.server.to(`debug:${payload.sessionId}`).emit('session-updated', payload.session);
  }

  @OnEvent('debug.paused')
  handleDebugPaused(payload: { sessionId: string; nodeId: string; nodeData: any }) {
    this.server.to(`debug:${payload.sessionId}`).emit('execution-paused', payload);
  }

  @OnEvent('debug.resumed')
  handleDebugResumed(payload: { sessionId: string; mode: StepMode }) {
    this.server.to(`debug:${payload.sessionId}`).emit('execution-resumed', payload);
  }

  @OnEvent('debug.node.executed')
  handleNodeExecuted(payload: { sessionId: string; nodeId: string; data: any }) {
    this.server.to(`debug:${payload.sessionId}`).emit('node-executed', payload);
  }

  @OnEvent('debug.log')
  handleDebugLog(payload: { sessionId: string; message: string; data?: any }) {
    this.server.to(`debug:${payload.sessionId}`).emit('debug-log', payload);
  }
}
