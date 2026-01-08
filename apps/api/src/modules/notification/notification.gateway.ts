import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NotificationService, NotificationWithUser } from './notification.service';
import { NotificationType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: '*', // Allow all origins for local network access
    
  },
  transports: ['polling', 'websocket'],
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds

  constructor(
    private jwtService: JwtService,
    private notificationService: NotificationService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      // Verify JWT
      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`Client ${client.id} has invalid token payload`);
        client.disconnect();
        return;
      }

      // Store user association
      client.userId = userId;
      client.join(`user:${userId}`);

      // Track socket for user
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // Send unread count on connect
      const unreadCount = await this.notificationService.getUnreadCount(userId);
      client.emit('unread-count', unreadCount);

      this.logger.log(`User ${userId} connected to notifications (socket: ${client.id})`);
    } catch (error) {
      this.logger.error(`Connection error for ${client.id}: ${error}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = client.userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`User ${userId} disconnected from notifications`);
    }
  }

  /**
   * Send a notification to a specific user in real-time
   */
  async sendNotification(userId: string, notification: NotificationWithUser): Promise<void> {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(`Sent notification to user ${userId}: ${notification.type}`);

    // Also update unread count
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    this.server.to(`user:${userId}`).emit('unread-count', unreadCount);
  }

  /**
   * Send notifications to multiple users
   */
  async sendNotificationToMany(
    userIds: string[],
    notificationData: Omit<NotificationWithUser, 'id' | 'userId' | 'createdAt' | 'read' | 'readAt'>,
  ): Promise<void> {
    for (const userId of userIds) {
      if (this.userSockets.has(userId)) {
        this.server.to(`user:${userId}`).emit('notification', {
          ...notificationData,
          userId,
          createdAt: new Date(),
          read: false,
          readAt: null,
        });

        const unreadCount = await this.notificationService.getUnreadCount(userId);
        this.server.to(`user:${userId}`).emit('unread-count', unreadCount);
      }
    }
  }

  /**
   * Subscribe to get recent notifications
   */
  @SubscribeMessage('get-notifications')
  async handleGetNotifications(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { limit?: number; offset?: number; type?: NotificationType },
  ) {
    if (!client.userId) return;

    const result = await this.notificationService.getNotifications(client.userId, {
      limit: data.limit || 20,
      offset: data.offset || 0,
      type: data.type,
    });

    client.emit('notifications-list', result);
  }

  /**
   * Mark notification as read via WebSocket
   */
  @SubscribeMessage('mark-read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId) return;

    await this.notificationService.markAsRead(data.notificationId, client.userId);
    const unreadCount = await this.notificationService.getUnreadCount(client.userId);
    client.emit('unread-count', unreadCount);
  }

  /**
   * Mark all notifications as read via WebSocket
   */
  @SubscribeMessage('mark-all-read')
  async handleMarkAllRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;

    await this.notificationService.markAllAsRead(client.userId);
    client.emit('unread-count', { unread: 0, byType: {} });
  }

  /**
   * Get unread count
   */
  @SubscribeMessage('get-unread-count')
  async handleGetUnreadCount(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId) return;

    const unreadCount = await this.notificationService.getUnreadCount(client.userId);
    client.emit('unread-count', unreadCount);
  }

  /**
   * Check if user is online (has active connections)
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get online user IDs
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.userSockets.keys());
  }
}
