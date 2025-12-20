import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../database/redis.service';
import {
  CollaboratorInfo,
  CursorPosition,
  ViewportState,
  REDIS_KEYS,
  getCollaboratorColor,
} from './realtime.interfaces';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Register a user joining a workflow session
   */
  async joinWorkflow(
    workflowId: string,
    userId: string,
    socketId: string,
  ): Promise<{ collaborator: CollaboratorInfo; existingCollaborators: CollaboratorInfo[] }> {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has access to the workflow
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: { include: { members: true } } },
    });

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const isMember = workflow.team.members.some(m => m.userId === userId);
    if (!isMember) {
      throw new Error('User does not have access to this workflow');
    }

    // Get existing collaborators count for color assignment
    const existingCollaborators = await this.getWorkflowCollaborators(workflowId);
    const colorIndex = existingCollaborators.length;

    const collaborator: CollaboratorInfo = {
      id: user.id,
      name: user.name || user.email.split('@')[0],
      email: user.email,
      avatar: user.avatar || undefined,
      color: getCollaboratorColor(colorIndex),
      socketId,
    };

    // Store in Redis
    const client = this.redis.getClient();
    await client.hset(
      REDIS_KEYS.workflowUsers(workflowId),
      socketId,
      JSON.stringify(collaborator),
    );

    // Map socket to user
    await client.set(REDIS_KEYS.userSocket(userId), socketId);

    // Create or update database session
    await this.prisma.workflowSession.upsert({
      where: {
        workflowId_socketId: { workflowId, socketId },
      },
      create: {
        workflowId,
        userId,
        socketId,
        color: collaborator.color,
        isActive: true,
        lastHeartbeat: new Date(),
      },
      update: {
        isActive: true,
        lastHeartbeat: new Date(),
        disconnectedAt: null,
      },
    });

    this.logger.log(`User ${user.email} joined workflow ${workflowId}`);

    return { collaborator, existingCollaborators };
  }

  /**
   * Handle user leaving a workflow
   */
  async leaveWorkflow(workflowId: string, socketId: string): Promise<void> {
    const client = this.redis.getClient();

    // Get collaborator info before removing
    const collaboratorJson = await client.hget(
      REDIS_KEYS.workflowUsers(workflowId),
      socketId,
    );

    if (collaboratorJson) {
      const collaborator = JSON.parse(collaboratorJson) as CollaboratorInfo;

      // Remove from Redis
      await client.hdel(REDIS_KEYS.workflowUsers(workflowId), socketId);
      await client.del(REDIS_KEYS.userSocket(collaborator.id));

      // Remove from typing set
      await client.srem(REDIS_KEYS.workflowTyping(workflowId), collaborator.id);

      // Update database session
      await this.prisma.workflowSession.updateMany({
        where: { workflowId, socketId },
        data: {
          isActive: false,
          disconnectedAt: new Date(),
        },
      });

      this.logger.log(`User ${collaborator.email} left workflow ${workflowId}`);
    }
  }

  /**
   * Get all active collaborators for a workflow
   */
  async getWorkflowCollaborators(workflowId: string): Promise<CollaboratorInfo[]> {
    const client = this.redis.getClient();
    const users = await client.hgetall(REDIS_KEYS.workflowUsers(workflowId));

    return Object.values(users).map(json => JSON.parse(json) as CollaboratorInfo);
  }

  /**
   * Update cursor position for a user
   */
  async updateCursor(
    workflowId: string,
    socketId: string,
    position: CursorPosition,
  ): Promise<void> {
    await this.prisma.workflowSession.updateMany({
      where: { workflowId, socketId, isActive: true },
      data: {
        cursorX: position.x,
        cursorY: position.y,
        lastHeartbeat: new Date(),
      },
    });
  }

  /**
   * Update viewport state for a user
   */
  async updateViewport(
    workflowId: string,
    socketId: string,
    viewport: ViewportState,
  ): Promise<void> {
    await this.prisma.workflowSession.updateMany({
      where: { workflowId, socketId, isActive: true },
      data: {
        viewportX: viewport.x,
        viewportY: viewport.y,
        viewportZoom: viewport.zoom,
        lastHeartbeat: new Date(),
      },
    });
  }

  /**
   * Set typing status for a user
   */
  async setTypingStatus(
    workflowId: string,
    userId: string,
    isTyping: boolean,
  ): Promise<void> {
    const client = this.redis.getClient();
    const key = REDIS_KEYS.workflowTyping(workflowId);

    if (isTyping) {
      await client.sadd(key, userId);
      // Auto-expire typing status after 10 seconds
      await client.expire(key, 10);
    } else {
      await client.srem(key, userId);
    }
  }

  /**
   * Get users currently typing in a workflow
   */
  async getTypingUsers(workflowId: string): Promise<string[]> {
    const client = this.redis.getClient();
    return client.smembers(REDIS_KEYS.workflowTyping(workflowId));
  }

  /**
   * Start following another user
   */
  async startFollowing(
    workflowId: string,
    followerId: string,
    targetUserId: string,
  ): Promise<ViewportState | null> {
    const client = this.redis.getClient();
    await client.set(REDIS_KEYS.userFollowing(followerId), targetUserId);

    // Get target user's current viewport
    const session = await this.prisma.workflowSession.findFirst({
      where: {
        workflowId,
        userId: targetUserId,
        isActive: true,
      },
      select: {
        viewportX: true,
        viewportY: true,
        viewportZoom: true,
      },
    });

    if (session && session.viewportX !== null && session.viewportY !== null && session.viewportZoom !== null) {
      return {
        x: session.viewportX,
        y: session.viewportY,
        zoom: session.viewportZoom,
      };
    }

    return null;
  }

  /**
   * Stop following another user
   */
  async stopFollowing(followerId: string): Promise<void> {
    const client = this.redis.getClient();
    await client.del(REDIS_KEYS.userFollowing(followerId));
  }

  /**
   * Get who a user is following
   */
  async getFollowingTarget(followerId: string): Promise<string | null> {
    const client = this.redis.getClient();
    return client.get(REDIS_KEYS.userFollowing(followerId));
  }

  /**
   * Get all users following a specific user
   */
  async getFollowers(targetUserId: string): Promise<string[]> {
    const client = this.redis.getClient();
    const keys = await client.keys(`collab:follow:*`);
    const followers: string[] = [];

    for (const key of keys) {
      const target = await client.get(key);
      if (target === targetUserId) {
        // Extract follower ID from key
        const followerId = key.replace('collab:follow:', '');
        followers.push(followerId);
      }
    }

    return followers;
  }

  /**
   * Handle heartbeat for keeping sessions alive
   */
  async heartbeat(workflowId: string, socketId: string): Promise<void> {
    await this.prisma.workflowSession.updateMany({
      where: { workflowId, socketId, isActive: true },
      data: { lastHeartbeat: new Date() },
    });
  }

  /**
   * Cleanup stale sessions (called periodically)
   */
  async cleanupStaleSessions(maxAge: number = 60000): Promise<void> {
    const staleTime = new Date(Date.now() - maxAge);

    const staleSessions = await this.prisma.workflowSession.findMany({
      where: {
        isActive: true,
        lastHeartbeat: { lt: staleTime },
      },
    });

    const client = this.redis.getClient();

    for (const session of staleSessions) {
      // Remove from Redis
      await client.hdel(
        REDIS_KEYS.workflowUsers(session.workflowId),
        session.socketId,
      );
      await client.del(REDIS_KEYS.userSocket(session.userId));

      this.logger.warn(`Cleaned up stale session for user ${session.userId}`);
    }

    // Mark sessions as inactive in database
    await this.prisma.workflowSession.updateMany({
      where: {
        isActive: true,
        lastHeartbeat: { lt: staleTime },
      },
      data: {
        isActive: false,
        disconnectedAt: new Date(),
      },
    });
  }

  /**
   * Get socket ID for a user
   */
  async getUserSocketId(userId: string): Promise<string | null> {
    const client = this.redis.getClient();
    return client.get(REDIS_KEYS.userSocket(userId));
  }

  /**
   * Get collaborator info by socket ID
   */
  async getCollaboratorBySocketId(
    workflowId: string,
    socketId: string,
  ): Promise<CollaboratorInfo | null> {
    const client = this.redis.getClient();
    const json = await client.hget(REDIS_KEYS.workflowUsers(workflowId), socketId);
    return json ? JSON.parse(json) : null;
  }
}
