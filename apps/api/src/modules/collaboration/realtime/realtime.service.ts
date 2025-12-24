import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { RedisService } from '../../../database/redis.service';
import {
  CollaboratorInfo,
  CursorPosition,
  ViewportState,
  REDIS_KEYS,
  REDIS_TTL,
  getCollaboratorColor,
} from './realtime.interfaces';

/**
 * RealtimeService - Manages real-time collaboration sessions
 *
 * PERFORMANCE OPTIMIZATION:
 * Cursor and viewport data is now stored in Redis only (not PostgreSQL).
 * This eliminates expensive database writes on every mouse move.
 *
 * Data storage strategy:
 * - PostgreSQL: Persistent session metadata (connect/disconnect times, colors)
 * - Redis: Ephemeral data (cursor positions, viewport state, typing status)
 */
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

    // Create or update database session (persistent metadata only)
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

      // Remove from Redis (all ephemeral data)
      await client.hdel(REDIS_KEYS.workflowUsers(workflowId), socketId);
      await client.del(REDIS_KEYS.userSocket(collaborator.id));
      await client.del(REDIS_KEYS.userCursor(socketId));
      await client.del(REDIS_KEYS.userViewport(socketId));

      // Remove from typing set
      await client.srem(REDIS_KEYS.workflowTyping(workflowId), collaborator.id);

      // Update database session (persistent metadata)
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
   * Update cursor position for a user (Redis only - no DB writes)
   * PERFORMANCE: This eliminates database writes on every mouse move
   */
  async updateCursor(
    workflowId: string,
    socketId: string,
    position: CursorPosition,
  ): Promise<void> {
    const client = this.redis.getClient();

    // Store cursor in Redis with TTL (no database write!)
    await client.setex(
      REDIS_KEYS.userCursor(socketId),
      REDIS_TTL.cursor,
      JSON.stringify({ ...position, workflowId, updatedAt: Date.now() }),
    );
  }

  /**
   * Get cursor position for a user
   */
  async getCursor(socketId: string): Promise<CursorPosition | null> {
    const client = this.redis.getClient();
    const data = await client.get(REDIS_KEYS.userCursor(socketId));

    if (data) {
      const parsed = JSON.parse(data);
      return { x: parsed.x, y: parsed.y };
    }

    return null;
  }

  /**
   * Update viewport state for a user (Redis only - no DB writes)
   * PERFORMANCE: This eliminates database writes on every viewport change
   */
  async updateViewport(
    workflowId: string,
    socketId: string,
    viewport: ViewportState,
  ): Promise<void> {
    const client = this.redis.getClient();

    // Store viewport in Redis with TTL (no database write!)
    await client.setex(
      REDIS_KEYS.userViewport(socketId),
      REDIS_TTL.viewport,
      JSON.stringify({ ...viewport, workflowId, updatedAt: Date.now() }),
    );
  }

  /**
   * Get viewport state for a user
   */
  async getViewport(socketId: string): Promise<ViewportState | null> {
    const client = this.redis.getClient();
    const data = await client.get(REDIS_KEYS.userViewport(socketId));

    if (data) {
      const parsed = JSON.parse(data);
      return { x: parsed.x, y: parsed.y, zoom: parsed.zoom };
    }

    return null;
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
      // Auto-expire typing status
      await client.expire(key, REDIS_TTL.typing);
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

    // Get target user's socket ID
    const targetSocketId = await client.get(REDIS_KEYS.userSocket(targetUserId));

    if (targetSocketId) {
      // Get target user's current viewport from Redis
      return this.getViewport(targetSocketId);
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
   * Only updates DB periodically to reduce writes
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
      // Remove from Redis (all ephemeral data)
      await client.hdel(
        REDIS_KEYS.workflowUsers(session.workflowId),
        session.socketId,
      );
      await client.del(REDIS_KEYS.userSocket(session.userId));
      await client.del(REDIS_KEYS.userCursor(session.socketId));
      await client.del(REDIS_KEYS.userViewport(session.socketId));

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

  /**
   * Get all cursors for a workflow (for initial sync)
   */
  async getWorkflowCursors(workflowId: string): Promise<Map<string, CursorPosition>> {
    const collaborators = await this.getWorkflowCollaborators(workflowId);
    const cursors = new Map<string, CursorPosition>();

    for (const collab of collaborators) {
      const cursor = await this.getCursor(collab.socketId);
      if (cursor) {
        cursors.set(collab.socketId, cursor);
      }
    }

    return cursors;
  }

  /**
   * Update guest cursor position (Redis only)
   */
  async updateGuestCursor(
    sessionId: string,
    position: CursorPosition,
  ): Promise<void> {
    const client = this.redis.getClient();
    await client.setex(
      REDIS_KEYS.guestCursor(sessionId),
      REDIS_TTL.cursor,
      JSON.stringify({ ...position, updatedAt: Date.now() }),
    );
  }

  /**
   * Update guest viewport state (Redis only)
   */
  async updateGuestViewport(
    sessionId: string,
    viewport: ViewportState,
  ): Promise<void> {
    const client = this.redis.getClient();
    await client.setex(
      REDIS_KEYS.guestViewport(sessionId),
      REDIS_TTL.viewport,
      JSON.stringify({ ...viewport, updatedAt: Date.now() }),
    );
  }

  /**
   * Get guest cursor position
   */
  async getGuestCursor(sessionId: string): Promise<CursorPosition | null> {
    const client = this.redis.getClient();
    const data = await client.get(REDIS_KEYS.guestCursor(sessionId));

    if (data) {
      const parsed = JSON.parse(data);
      return { x: parsed.x, y: parsed.y };
    }

    return null;
  }

  /**
   * Get guest viewport state
   */
  async getGuestViewport(sessionId: string): Promise<ViewportState | null> {
    const client = this.redis.getClient();
    const data = await client.get(REDIS_KEYS.guestViewport(sessionId));

    if (data) {
      const parsed = JSON.parse(data);
      return { x: parsed.x, y: parsed.y, zoom: parsed.zoom };
    }

    return null;
  }
}
