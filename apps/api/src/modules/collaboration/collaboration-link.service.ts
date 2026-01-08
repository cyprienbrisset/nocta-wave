import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CollaborationPermission } from '@prisma/client';
import { getCollaboratorColor } from './realtime/realtime.interfaces';

export interface CreateLinkDto {
  workflowId: string;
  name?: string;
  permission?: CollaborationPermission;
  maxUses?: number;
  expiresInHours?: number;
}

export interface CollaborationLinkWithUrl {
  id: string;
  workflowId: string;
  token: string;
  name: string | null;
  permission: CollaborationPermission;
  maxUses: number | null;
  useCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  url: string;
}

export interface GuestInfo {
  id: string;
  name: string;
  color: string;
  permission: CollaborationPermission;
  workflowId: string;
  workflowName: string;
  isGuest: true;
}

@Injectable()
export class CollaborationLinkService {
  private readonly logger = new Logger(CollaborationLinkService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new collaboration link
   */
  async createLink(
    userId: string,
    dto: CreateLinkDto,
  ): Promise<CollaborationLinkWithUrl> {
    // Verify workflow exists and user has access
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: dto.workflowId },
      include: { team: { include: { members: true } } },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check user is owner or admin
    const membership = workflow.team.members.find((m) => m.userId === userId);
    if (!membership || !['OWNER', 'ADMIN'].includes(membership.role)) {
      throw new ForbiddenException(
        'Only team owners and admins can create collaboration links',
      );
    }

    const expiresAt = dto.expiresInHours
      ? new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)
      : null;

    const link = await this.prisma.collaborationLink.create({
      data: {
        workflowId: dto.workflowId,
        createdById: userId,
        name: dto.name,
        permission: dto.permission || 'VIEW',
        maxUses: dto.maxUses,
        expiresAt,
      },
    });

    this.logger.log(
      `Collaboration link created for workflow ${dto.workflowId} by user ${userId}`,
    );

    return this.addUrl(link);
  }

  /**
   * Get all links for a workflow
   */
  async getLinksForWorkflow(
    workflowId: string,
    userId: string,
  ): Promise<CollaborationLinkWithUrl[]> {
    // Verify access
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: { team: { include: { members: true } } },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const isMember = workflow.team.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You do not have access to this workflow');
    }

    const links = await this.prisma.collaborationLink.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => this.addUrl(link));
  }

  /**
   * Validate a collaboration link and return guest info
   */
  async validateLink(token: string, guestName: string): Promise<GuestInfo> {
    const link = await this.prisma.collaborationLink.findUnique({
      where: { token },
      include: {
        workflow: { select: { id: true, name: true } },
        guestSessions: { where: { isActive: true } },
      },
    });

    if (!link) {
      throw new NotFoundException('Invalid or expired link');
    }

    if (!link.isActive) {
      throw new BadRequestException('This link has been deactivated');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      throw new BadRequestException('This link has expired');
    }

    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new BadRequestException('This link has reached its maximum uses');
    }

    // Increment use count
    await this.prisma.collaborationLink.update({
      where: { id: link.id },
      data: { useCount: { increment: 1 } },
    });

    // Create guest session
    const colorIndex = link.guestSessions.length;
    const guestSession = await this.prisma.guestSession.create({
      data: {
        linkId: link.id,
        guestName: guestName.trim(),
        guestColor: getCollaboratorColor(colorIndex),
        isActive: true,
      },
    });

    this.logger.log(
      `Guest "${guestName}" joined workflow ${link.workflowId} via link ${link.id}`,
    );

    return {
      id: guestSession.id,
      name: guestSession.guestName,
      color: guestSession.guestColor,
      permission: link.permission,
      workflowId: link.workflow.id,
      workflowName: link.workflow.name,
      isGuest: true,
    };
  }

  /**
   * Get link info without validating (for preview)
   */
  async getLinkInfo(token: string): Promise<{
    id: string;
    workflowName: string;
    creatorName: string;
    permission: CollaborationPermission;
    isValid: boolean;
    expiresAt: Date | null;
    error?: string;
  }> {
    const link = await this.prisma.collaborationLink.findUnique({
      where: { token },
      include: {
        workflow: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!link) {
      return {
        id: '',
        workflowName: '',
        creatorName: '',
        permission: 'VIEW',
        isValid: false,
        expiresAt: null,
        error: 'Link not found',
      };
    }

    const baseResult = {
      id: link.id,
      workflowName: link.workflow.name,
      creatorName: link.createdBy.name || 'Utilisateur',
      permission: link.permission,
      expiresAt: link.expiresAt,
    };

    if (!link.isActive) {
      return {
        ...baseResult,
        isValid: false,
        error: 'This link has been deactivated',
      };
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return {
        ...baseResult,
        isValid: false,
        error: 'This link has expired',
      };
    }

    if (link.maxUses && link.useCount >= link.maxUses) {
      return {
        ...baseResult,
        isValid: false,
        error: 'This link has reached its maximum uses',
      };
    }

    return {
      ...baseResult,
      isValid: true,
    };
  }

  /**
   * Get workflow data for a guest session
   */
  async getWorkflowForGuest(guestSessionId: string): Promise<{
    workflow: {
      id: string;
      name: string;
      description: string | null;
      graph: any;
    };
    permission: CollaborationPermission;
  }> {
    const session = await this.prisma.guestSession.findUnique({
      where: { id: guestSessionId },
      include: {
        link: {
          include: {
            workflow: {
              select: {
                id: true,
                name: true,
                description: true,
                graph: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Guest session not found');
    }

    if (!session.isActive) {
      throw new ForbiddenException('This guest session is no longer active');
    }

    if (!session.link.isActive) {
      throw new ForbiddenException('The collaboration link has been deactivated');
    }

    return {
      workflow: session.link.workflow,
      permission: session.link.permission,
    };
  }

  /**
   * Deactivate a link
   */
  async deactivateLink(linkId: string, userId: string): Promise<void> {
    const link = await this.prisma.collaborationLink.findUnique({
      where: { id: linkId },
      include: { workflow: { include: { team: { include: { members: true } } } } },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Check permissions
    const membership = link.workflow.team.members.find((m) => m.userId === userId);
    if (
      !membership ||
      (!['OWNER', 'ADMIN'].includes(membership.role) && link.createdById !== userId)
    ) {
      throw new ForbiddenException('You cannot deactivate this link');
    }

    await this.prisma.collaborationLink.update({
      where: { id: linkId },
      data: { isActive: false },
    });

    // Disconnect all active guest sessions
    await this.prisma.guestSession.updateMany({
      where: { linkId, isActive: true },
      data: { isActive: false, disconnectedAt: new Date() },
    });

    this.logger.log(`Link ${linkId} deactivated by user ${userId}`);
  }

  /**
   * Delete a link
   */
  async deleteLink(linkId: string, userId: string): Promise<void> {
    const link = await this.prisma.collaborationLink.findUnique({
      where: { id: linkId },
      include: { workflow: { include: { team: { include: { members: true } } } } },
    });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    // Check permissions - only owner/admin or creator
    const membership = link.workflow.team.members.find((m) => m.userId === userId);
    if (
      !membership ||
      (!['OWNER', 'ADMIN'].includes(membership.role) && link.createdById !== userId)
    ) {
      throw new ForbiddenException('You cannot delete this link');
    }

    await this.prisma.collaborationLink.delete({
      where: { id: linkId },
    });

    this.logger.log(`Link ${linkId} deleted by user ${userId}`);
  }

  /**
   * Get guest session by ID
   */
  async getGuestSession(sessionId: string) {
    return this.prisma.guestSession.findUnique({
      where: { id: sessionId },
      include: { link: true },
    });
  }

  /**
   * Update guest session with socket info
   * Note: cursorX, cursorY, viewportX, viewportY, viewportZoom are stored in Redis, not in DB
   */
  async updateGuestSession(
    sessionId: string,
    data: {
      socketId?: string;
      cursorX?: number;
      cursorY?: number;
      viewportX?: number;
      viewportY?: number;
      viewportZoom?: number;
      isActive?: boolean;
    },
  ) {
    // Filter out cursor/viewport fields - these are stored in Redis, not in DB
    const { cursorX, cursorY, viewportX, viewportY, viewportZoom, ...dbData } = data;

    return this.prisma.guestSession.update({
      where: { id: sessionId },
      data: {
        ...dbData,
        lastHeartbeat: new Date(),
        disconnectedAt: dbData.isActive === false ? new Date() : undefined,
      },
    });
  }

  /**
   * Disconnect a guest session
   */
  async disconnectGuestSession(sessionId: string): Promise<void> {
    await this.prisma.guestSession.update({
      where: { id: sessionId },
      data: { isActive: false, disconnectedAt: new Date(), socketId: null },
    });
  }

  /**
   * Get active guests for a workflow
   */
  async getActiveGuests(workflowId: string) {
    return this.prisma.guestSession.findMany({
      where: {
        link: { workflowId },
        isActive: true,
      },
      include: { link: { select: { permission: true } } },
    });
  }

  private addUrl(link: any): CollaborationLinkWithUrl {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return {
      ...link,
      url: `${baseUrl}/collaborate/${link.token}`,
    };
  }
}
