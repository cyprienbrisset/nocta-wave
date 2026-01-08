import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RealtimeService } from './realtime.service';
import { RedisService } from '../../../database/redis.service';
import {
  AuthenticatedSocket,
  CollaboratorInfo,
  ViewportState,
  GuestInfo,
  getCollaboratorColor,
} from './realtime.interfaces';
import {
  JoinWorkflowDto,
  LeaveWorkflowDto,
  CursorMoveDto,
  ViewportUpdateDto,
  ChatMessageDto,
  TypingDto,
  FollowDto,
  StopFollowDto,
  WorkflowChangeDto,
} from './realtime.dto';
import { ChatService } from '../chat.service';
import { ChangeService } from '../change.service';
import { CollaborationLinkService } from '../collaboration-link.service';

@WebSocketGateway({
  cors: {
    origin: true, // Allow all origins dynamically
    credentials: true, // Allow cookies
  },
  namespace: '/collaboration',
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);
  private subscriber: any;

  // Track which workflows each socket is in
  private socketWorkflows = new Map<string, Set<string>>();
  // Track guest sessions by socket ID
  private guestSockets = new Map<string, GuestInfo>();

  constructor(
    private realtimeService: RealtimeService,
    private chatService: ChatService,
    private changeService: ChangeService,
    private linkService: CollaborationLinkService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
  ) {}

  afterInit() {
    this.logger.log('Collaboration Gateway initialized');
    this.setupRedisSubscriber();
    this.startHeartbeatCheck();
  }

  private async setupRedisSubscriber() {
    this.subscriber = this.redis.createSubscriber();

    await this.subscriber.subscribe(
      'collab:cursor:update',
      'collab:presence:update',
      'collab:chat:message',
      'collab:chat:typing',
      'collab:viewport:update',
      'collab:change:new',
    );

    this.subscriber.on('message', (channel: string, message: string) => {
      const data = JSON.parse(message);
      this.handleRedisMessage(channel, data);
    });
  }

  private handleRedisMessage(channel: string, data: any) {
    const { workflowId } = data;
    if (!workflowId) return;

    const room = `workflow:${workflowId}`;

    switch (channel) {
      case 'collab:cursor:update':
        this.server.to(room).emit('cursor:updated', data);
        break;
      case 'collab:presence:update':
        this.server.to(room).emit('presence:update', data);
        break;
      case 'collab:chat:message':
        this.server.to(room).emit('chat:new', data);
        break;
      case 'collab:chat:typing':
        this.server.to(room).emit('chat:typing', data);
        break;
      case 'collab:viewport:update':
        this.handleViewportBroadcast(data);
        break;
      case 'collab:change:new':
        this.server.to(room).emit('change:new', data);
        break;
    }
  }

  private async handleViewportBroadcast(data: {
    workflowId: string;
    userId: string;
    viewport: ViewportState;
  }) {
    const followers = await this.realtimeService.getFollowers(data.userId);

    for (const followerId of followers) {
      const socketId = await this.realtimeService.getUserSocketId(followerId);
      if (socketId) {
        this.server.to(socketId).emit('viewport:sync', {
          workflowId: data.workflowId,
          viewport: data.viewport,
          leaderId: data.userId,
        });
      }
    }
  }

  private startHeartbeatCheck() {
    setInterval(async () => {
      try {
        await this.realtimeService.cleanupStaleSessions(60000);
      } catch (error) {
        this.logger.error('Error cleaning up stale sessions:', error);
      }
    }, 30000);
  }

  /**
   * Extract JWT token from cookie or handshake auth
   */
  private extractToken(client: Socket): string | null {
    // Try to get from cookie first (HTTP-only cookies)
    const cookies = client.handshake.headers?.cookie;
    if (cookies) {
      const match = cookies.match(/accessToken=([^;]+)/);
      if (match) {
        return match[1];
      }
    }

    // Fall back to auth handshake or Authorization header (for backwards compatibility)
    return (
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace('Bearer ', '') ||
      null
    );
  }

  /**
   * Handle socket connection - supports both JWT auth and guest tokens
   */
  async handleConnection(client: Socket) {
    const token = this.extractToken(client);
    const guestSessionId = client.handshake.auth?.guestSessionId;

    // Guest connection
    if (guestSessionId) {
      try {
        const guestSession = await this.linkService.getGuestSession(guestSessionId);

        if (!guestSession || !guestSession.link.isActive) {
          this.logger.warn(`Guest ${client.id} - invalid session`);
          client.emit('error', { message: 'Invalid or expired guest session' });
          client.disconnect();
          return;
        }

        // Get workflow ID from link
        const link = guestSession.link;

        const guestInfo: GuestInfo = {
          id: guestSession.id,
          name: guestSession.guestName,
          color: guestSession.guestColor,
          permission: link.permission,
          workflowId: link.workflowId,
          isGuest: true,
        };

        (client as AuthenticatedSocket).guest = guestInfo;
        this.guestSockets.set(client.id, guestInfo);
        this.socketWorkflows.set(client.id, new Set());

        // Update guest session with socket ID
        await this.linkService.updateGuestSession(guestSession.id, {
          socketId: client.id,
        });

        this.logger.log(`Guest "${guestSession.guestName}" connected (${client.id})`);
        return;
      } catch (error) {
        this.logger.error(`Guest connection error:`, error);
        client.emit('error', { message: 'Guest connection failed' });
        client.disconnect();
        return;
      }
    }

    // JWT user connection
    if (token) {
      try {
        const payload = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        (client as AuthenticatedSocket).user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          isGuest: false,
        };

        this.socketWorkflows.set(client.id, new Set());
        this.logger.log(`User ${payload.email} connected (${client.id})`);
        return;
      } catch (error) {
        this.logger.warn(`JWT auth failed for ${client.id}`);
      }
    }

    // No valid auth
    this.logger.warn(`Client ${client.id} connected without valid auth`);
    client.emit('error', { message: 'Authentication required' });
    client.disconnect();
  }

  async handleDisconnect(client: Socket) {
    const workflows = this.socketWorkflows.get(client.id) || new Set();
    const guestInfo = this.guestSockets.get(client.id);

    // Leave all workflows
    for (const workflowId of workflows) {
      await this.handleLeaveWorkflow(client, { workflowId });
    }

    // Disconnect guest session
    if (guestInfo) {
      await this.linkService.disconnectGuestSession(guestInfo.id);
      this.guestSockets.delete(client.id);
    }

    this.socketWorkflows.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Get user or guest info from socket
   */
  private getSocketInfo(client: Socket): {
    id: string;
    name: string;
    email?: string;
    isGuest: boolean;
    permission?: string;
  } {
    const authClient = client as AuthenticatedSocket;

    if (authClient.guest) {
      return {
        id: authClient.guest.id,
        name: authClient.guest.name,
        isGuest: true,
        permission: authClient.guest.permission,
      };
    }

    if (authClient.user) {
      return {
        id: authClient.user.id,
        name: authClient.user.name,
        email: authClient.user.email,
        isGuest: false,
      };
    }

    throw new WsException('Not authenticated');
  }

  /**
   * Check if user has permission for an action
   */
  private checkPermission(client: Socket, requiredPermission: 'VIEW' | 'COMMENT' | 'EDIT'): boolean {
    const authClient = client as AuthenticatedSocket;

    // Authenticated users have full access
    if (authClient.user) return true;

    // Guests check permissions
    if (authClient.guest) {
      const guestPerm = authClient.guest.permission;

      if (requiredPermission === 'VIEW') return true;
      if (requiredPermission === 'COMMENT') return guestPerm === 'COMMENT' || guestPerm === 'EDIT';
      if (requiredPermission === 'EDIT') return guestPerm === 'EDIT';
    }

    return false;
  }

  /**
   * Join a workflow room
   */
  @SubscribeMessage('join:workflow')
  async handleJoinWorkflow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinWorkflowDto,
  ) {
    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    try {
      let collaborator: CollaboratorInfo;
      let existingCollaborators: CollaboratorInfo[] = [];

      if (authClient.guest) {
        // Guest joining - verify they're joining their assigned workflow
        if (authClient.guest.workflowId !== data.workflowId) {
          throw new WsException('You can only join the workflow you were invited to');
        }

        // Get existing collaborators
        existingCollaborators = await this.realtimeService.getWorkflowCollaborators(data.workflowId);

        // Create collaborator info for guest
        collaborator = {
          id: `guest:${authClient.guest.id}`,
          name: `${authClient.guest.name} (Guest)`,
          email: '',
          color: authClient.guest.color,
          socketId: client.id,
        };

        // Store guest in Redis
        const redisClient = this.redis.getClient();
        await redisClient.hset(
          `collab:workflow:${data.workflowId}:users`,
          client.id,
          JSON.stringify(collaborator),
        );
      } else {
        // Regular user joining
        const result = await this.realtimeService.joinWorkflow(
          data.workflowId,
          info.id,
          client.id,
        );
        collaborator = result.collaborator;
        existingCollaborators = result.existingCollaborators;
      }

      // Join socket room
      const room = `workflow:${data.workflowId}`;
      client.join(room);

      // Track workflow for this socket
      const workflows = this.socketWorkflows.get(client.id) || new Set();
      workflows.add(data.workflowId);
      this.socketWorkflows.set(client.id, workflows);

      // Log rooms for debugging
      this.logger.log(`${info.isGuest ? 'Guest' : 'User'} "${info.name}" joined room ${room}. Client rooms: ${Array.from(client.rooms).join(', ')}`);

      // Notify others in the room
      client.to(room).emit('user:joined', {
        workflowId: data.workflowId,
        collaborator,
      });

      this.logger.log(`Notified room ${room} of new user. Existing collaborators: ${existingCollaborators.length}`);

      return {
        success: true,
        collaborator,
        collaborators: existingCollaborators,
        permission: info.isGuest ? info.permission : 'EDIT',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error joining workflow: ${message}`);
      throw new WsException(message);
    }
  }

  /**
   * Leave a workflow room
   */
  @SubscribeMessage('leave:workflow')
  async handleLeaveWorkflow(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveWorkflowDto,
  ) {
    const authClient = client as AuthenticatedSocket;
    const info = this.getSocketInfo(client);

    // Get collaborator before removing
    const collaborator = await this.realtimeService.getCollaboratorBySocketId(
      data.workflowId,
      client.id,
    );

    if (authClient.guest) {
      // Remove guest from Redis
      const redisClient = this.redis.getClient();
      await redisClient.hdel(`collab:workflow:${data.workflowId}:users`, client.id);
    } else {
      await this.realtimeService.leaveWorkflow(data.workflowId, client.id);
      await this.realtimeService.stopFollowing(info.id);
    }

    // Leave socket room
    const room = `workflow:${data.workflowId}`;
    client.leave(room);

    // Remove from tracking
    const workflows = this.socketWorkflows.get(client.id);
    if (workflows) {
      workflows.delete(data.workflowId);
    }

    // Notify others
    if (collaborator) {
      client.to(room).emit('user:left', {
        workflowId: data.workflowId,
        collaborator,
      });
    }

    return { success: true };
  }

  /**
   * Update cursor position
   */
  @SubscribeMessage('cursor:move')
  async handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CursorMoveDto,
  ) {
    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    if (authClient.guest) {
      // Update guest cursor in session
      await this.linkService.updateGuestSession(authClient.guest.id, {
        cursorX: data.position.x,
        cursorY: data.position.y,
      });
    } else {
      await this.realtimeService.updateCursor(
        data.workflowId,
        client.id,
        data.position,
      );
    }

    // Broadcast to others in the room
    const room = `workflow:${data.workflowId}`;
    const userId = authClient.guest ? `guest:${info.id}` : info.id;

    // Log for debugging
    this.logger.debug(`Broadcasting cursor from ${userId} to room ${room}`);

    client.to(room).emit('cursor:updated', {
      workflowId: data.workflowId,
      userId,
      position: data.position,
    });
  }

  /**
   * Update viewport state
   */
  @SubscribeMessage('viewport:update')
  async handleViewportUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ViewportUpdateDto,
  ) {
    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    if (authClient.guest) {
      await this.linkService.updateGuestSession(authClient.guest.id, {
        viewportX: data.viewport.x,
        viewportY: data.viewport.y,
        viewportZoom: data.viewport.zoom,
      });
    } else {
      await this.realtimeService.updateViewport(
        data.workflowId,
        client.id,
        data.viewport,
      );

      // Broadcast to followers via Redis
      await this.redis.publish('collab:viewport:update', {
        workflowId: data.workflowId,
        userId: info.id,
        viewport: data.viewport,
      });
    }
  }

  /**
   * Send a chat message (requires COMMENT permission)
   */
  @SubscribeMessage('chat:message')
  async handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ChatMessageDto,
  ) {
    if (!this.checkPermission(client, 'COMMENT')) {
      throw new WsException('You do not have permission to send messages');
    }

    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    try {
      // Guests can't create real chat messages (no user ID)
      // But we can still broadcast their message in real-time
      if (authClient.guest) {
        const guestMessage = {
          id: `guest-${Date.now()}`,
          workflowId: data.workflowId,
          content: data.content,
          parentId: data.parentId || null,
          nodeId: data.nodeId || null,
          createdAt: new Date().toISOString(),
          editedAt: null,
          author: {
            id: `guest:${authClient.guest.id}`,
            name: `${authClient.guest.name} (Guest)`,
            email: null,
            avatar: null,
          },
          mentions: [],
        };

        const room = `workflow:${data.workflowId}`;
        this.server.to(room).emit('chat:new', {
          workflowId: data.workflowId,
          message: guestMessage,
        });

        return { success: true, message: guestMessage };
      }

      // Regular user message
      const message = await this.chatService.createMessage(
        data.workflowId,
        info.id,
        data.content,
        data.parentId,
        data.nodeId,
      );

      const room = `workflow:${data.workflowId}`;
      this.server.to(room).emit('chat:new', {
        workflowId: data.workflowId,
        message,
      });

      return { success: true, message };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error sending chat message: ${message}`);
      throw new WsException(message);
    }
  }

  /**
   * Update typing status
   */
  @SubscribeMessage('chat:typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingDto,
  ) {
    if (!this.checkPermission(client, 'COMMENT')) return;

    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    if (!authClient.guest) {
      await this.realtimeService.setTypingStatus(
        data.workflowId,
        info.id,
        data.isTyping,
      );
    }

    const room = `workflow:${data.workflowId}`;
    client.to(room).emit('chat:typing', {
      workflowId: data.workflowId,
      userId: authClient.guest ? `guest:${info.id}` : info.id,
      userName: info.name,
      isTyping: data.isTyping,
    });
  }

  /**
   * Start following another user
   */
  @SubscribeMessage('follow:start')
  async handleFollowStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: FollowDto,
  ) {
    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    // Guests can follow but we don't persist it
    if (authClient.guest) {
      return { success: true, viewport: null };
    }

    const viewport = await this.realtimeService.startFollowing(
      data.workflowId,
      info.id,
      data.targetUserId,
    );

    const targetSocketId = await this.realtimeService.getUserSocketId(data.targetUserId);
    if (targetSocketId) {
      this.server.to(targetSocketId).emit('follow:started', {
        workflowId: data.workflowId,
        followerId: info.id,
        followerName: info.name,
      });
    }

    return { success: true, viewport };
  }

  /**
   * Stop following another user
   */
  @SubscribeMessage('follow:stop')
  async handleFollowStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StopFollowDto,
  ) {
    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    if (authClient.guest) {
      return { success: true };
    }

    const targetUserId = await this.realtimeService.getFollowingTarget(info.id);
    await this.realtimeService.stopFollowing(info.id);

    if (targetUserId) {
      const targetSocketId = await this.realtimeService.getUserSocketId(targetUserId);
      if (targetSocketId) {
        this.server.to(targetSocketId).emit('follow:stopped', {
          workflowId: data.workflowId,
          followerId: info.id,
        });
      }
    }

    return { success: true };
  }

  /**
   * Broadcast a workflow change (requires EDIT permission)
   */
  @SubscribeMessage('change:broadcast')
  async handleChangeBroadcast(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: WorkflowChangeDto,
  ) {
    if (!this.checkPermission(client, 'EDIT')) {
      throw new WsException('You do not have permission to edit this workflow');
    }

    const info = this.getSocketInfo(client);
    const authClient = client as AuthenticatedSocket;

    // Guests with EDIT permission can broadcast changes but we don't persist them
    if (authClient.guest) {
      const guestChange = {
        id: `guest-change-${Date.now()}`,
        workflowId: data.workflowId,
        userId: `guest:${info.id}`,
        changeType: data.changeType,
        nodeId: data.nodeId,
        edgeId: data.edgeId,
        description: data.description || `${info.name} made a change`,
        createdAt: new Date().toISOString(),
        user: {
          id: `guest:${info.id}`,
          name: `${info.name} (Guest)`,
          email: null,
          avatar: null,
        },
      };

      const room = `workflow:${data.workflowId}`;
      this.server.to(room).emit('change:new', {
        workflowId: data.workflowId,
        change: guestChange,
      });

      return { success: true, change: guestChange };
    }

    try {
      const change = await this.changeService.recordChange(
        data.workflowId,
        info.id,
        data.changeType as any,
        {
          nodeId: data.nodeId,
          edgeId: data.edgeId,
          previousData: data.previousData,
          newData: data.newData,
          description: data.description,
        },
      );

      const room = `workflow:${data.workflowId}`;
      this.server.to(room).emit('change:new', {
        workflowId: data.workflowId,
        change,
      });

      return { success: true, change };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error broadcasting change: ${errorMessage}`);
      throw new WsException(errorMessage);
    }
  }

  /**
   * Heartbeat to keep session alive
   */
  @SubscribeMessage('heartbeat')
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    const authClient = client as AuthenticatedSocket;

    if (authClient.guest) {
      await this.linkService.updateGuestSession(authClient.guest.id, {});
    } else {
      await this.realtimeService.heartbeat(data.workflowId, client.id);
    }

    return { success: true, timestamp: Date.now() };
  }

  /**
   * Get current collaborators in a workflow
   */
  @SubscribeMessage('get:collaborators')
  async handleGetCollaborators(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string },
  ) {
    const collaborators = await this.realtimeService.getWorkflowCollaborators(
      data.workflowId,
    );
    return { success: true, collaborators };
  }

  /**
   * Broadcast graph update to all collaborators
   */
  @SubscribeMessage('graph:update')
  async handleGraphUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { workflowId: string; nodes: any[]; edges: any[] },
  ) {
    this.logger.log(`Received graph:update from ${client.id} for workflow ${data.workflowId}`);
    this.logger.log(`Graph data: ${data.nodes?.length || 0} nodes, ${data.edges?.length || 0} edges`);

    if (!this.checkPermission(client, 'EDIT')) {
      this.logger.warn(`Permission denied for ${client.id}`);
      throw new WsException('You do not have permission to update this workflow');
    }

    // Broadcast to all other clients in the room
    const room = `workflow:${data.workflowId}`;

    // Log client's rooms
    this.logger.log(`Client ${client.id} is in rooms: ${Array.from(client.rooms).join(', ')}`);

    client.to(room).emit('graph:update', {
      workflowId: data.workflowId,
      nodes: data.nodes,
      edges: data.edges,
    });

    this.logger.log(`Broadcasted graph:update to room ${room}`);

    return { success: true };
  }
}
