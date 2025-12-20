import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface ChatMessageWithAuthor {
  id: string;
  workflowId: string;
  content: string;
  parentId: string | null;
  nodeId: string | null;
  createdAt: Date;
  editedAt: Date | null;
  author: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  mentions: {
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
  replyCount?: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new chat message
   */
  async createMessage(
    workflowId: string,
    authorId: string,
    content: string,
    parentId?: string,
    nodeId?: string,
  ): Promise<ChatMessageWithAuthor> {
    // Verify workflow exists
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: { include: { members: true } } },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Verify user has access to workflow
    const isMember = workflow.team.members.some(m => m.userId === authorId);
    if (!isMember) {
      throw new ForbiddenException('User does not have access to this workflow');
    }

    // Parse mentions from content (@username)
    const mentionRegex = /@(\w+)/g;
    const mentionMatches = content.match(mentionRegex) || [];
    const mentionedUsernames = mentionMatches.map(m => m.substring(1));

    // Find mentioned users from team members
    const mentionedUsers = await this.prisma.user.findMany({
      where: {
        OR: [
          { name: { in: mentionedUsernames } },
          { email: { in: mentionedUsernames.map(u => `${u}@%`) } },
        ],
        teamMemberships: {
          some: { teamId: workflow.teamId },
        },
      },
      select: { id: true },
    });

    // Create message with mentions
    const message = await this.prisma.chatMessage.create({
      data: {
        workflowId,
        authorId,
        content,
        parentId,
        nodeId,
        mentions: {
          create: mentionedUsers.map(user => ({
            userId: user.id,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Chat message created in workflow ${workflowId} by ${authorId}`);

    return message;
  }

  /**
   * Get chat messages for a workflow
   */
  async getMessages(
    workflowId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      parentId?: string | null;
      nodeId?: string;
    },
  ): Promise<{ messages: ChatMessageWithAuthor[]; total: number }> {
    // Verify access
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: { include: { members: true } } },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const isMember = workflow.team.members.some(m => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('User does not have access to this workflow');
    }

    const where: any = {
      workflowId,
      deletedAt: null,
    };

    // Filter by parent (null for top-level, or specific parent for threads)
    if (options?.parentId !== undefined) {
      where.parentId = options.parentId;
    } else {
      where.parentId = null; // Default to top-level messages
    }

    if (options?.nodeId) {
      where.nodeId = options.nodeId;
    }

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          mentions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: { replies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.chatMessage.count({ where }),
    ]);

    // Transform to include replyCount
    const transformedMessages = messages.map(m => ({
      ...m,
      replyCount: m._count.replies,
      _count: undefined,
    }));

    return { messages: transformedMessages as any, total };
  }

  /**
   * Get thread replies
   */
  async getThreadReplies(
    workflowId: string,
    parentId: string,
    userId: string,
  ): Promise<ChatMessageWithAuthor[]> {
    const { messages } = await this.getMessages(workflowId, userId, {
      parentId,
      limit: 100,
    });
    return messages;
  }

  /**
   * Edit a message
   */
  async editMessage(
    messageId: string,
    userId: string,
    newContent: string,
  ): Promise<ChatMessageWithAuthor> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.authorId !== userId) {
      throw new ForbiddenException('Only the author can edit this message');
    }

    if (message.deletedAt) {
      throw new ForbiddenException('Cannot edit a deleted message');
    }

    const updated = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        editedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        mentions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        workflow: {
          include: { team: { include: { members: true } } },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Check if user is author or team admin
    const membership = message.workflow.team.members.find(m => m.userId === userId);
    if (!membership) {
      throw new ForbiddenException('User does not have access to this workflow');
    }

    const isAuthor = message.authorId === userId;
    const isAdmin = ['OWNER', 'ADMIN'].includes(membership.role);

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('Cannot delete this message');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    this.logger.log(`Message ${messageId} deleted by ${userId}`);
  }

  /**
   * Get unread mentions for a user
   */
  async getUnreadMentions(
    userId: string,
    workflowId?: string,
  ): Promise<{ mentionId: string; message: ChatMessageWithAuthor }[]> {
    const where: any = {
      userId,
      read: false,
      message: {
        deletedAt: null,
      },
    };

    if (workflowId) {
      where.message.workflowId = workflowId;
    }

    const mentions = await this.prisma.chatMention.findMany({
      where,
      include: {
        message: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            mentions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return mentions.map(m => ({
      mentionId: m.id,
      message: m.message as ChatMessageWithAuthor,
    }));
  }

  /**
   * Mark mentions as read
   */
  async markMentionsAsRead(userId: string, mentionIds: string[]): Promise<void> {
    await this.prisma.chatMention.updateMany({
      where: {
        id: { in: mentionIds },
        userId,
      },
      data: { read: true },
    });
  }

  /**
   * Get unread mention count for a user
   */
  async getUnreadMentionCount(userId: string, workflowId?: string): Promise<number> {
    const where: any = {
      userId,
      read: false,
      message: {
        deletedAt: null,
      },
    };

    if (workflowId) {
      where.message.workflowId = workflowId;
    }

    return this.prisma.chatMention.count({ where });
  }
}
