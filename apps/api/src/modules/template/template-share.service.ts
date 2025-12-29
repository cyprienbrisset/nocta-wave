import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SharePermission, Prisma } from '@prisma/client';

export interface TemplateShareWithDetails {
  id: string;
  templateId: string;
  sharedWithTeamId: string;
  sharedByUserId: string;
  permission: SharePermission;
  createdAt: Date;
  sharedWithTeam: {
    id: string;
    name: string;
    slug: string;
    avatar: string | null;
  };
}

interface ShareTemplateDto {
  teamId: string;
  permission?: SharePermission;
}

@Injectable()
export class TemplateShareService {
  private readonly logger = new Logger(TemplateShareService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Share a template with another team
   */
  async shareWithTeam(
    templateId: string,
    sharerUserId: string,
    sharerTeamId: string,
    dto: ShareTemplateDto,
  ): Promise<TemplateShareWithDetails> {
    // Verify template exists and belongs to sharer's team
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id: templateId,
        teamId: sharerTeamId,
      },
    });

    if (!template) {
      throw new NotFoundException('Template not found or you do not have permission to share it');
    }

    // Cannot share with own team
    if (dto.teamId === sharerTeamId) {
      throw new BadRequestException('Cannot share a template with your own team');
    }

    // Verify target team exists
    const targetTeam = await this.prisma.team.findUnique({
      where: { id: dto.teamId },
      include: {
        members: {
          where: { role: { in: ['OWNER', 'ADMIN'] } },
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (!targetTeam) {
      throw new NotFoundException('Target team not found');
    }

    // Check if already shared
    const existingShare = await this.prisma.templateShare.findUnique({
      where: {
        templateId_sharedWithTeamId: {
          templateId,
          sharedWithTeamId: dto.teamId,
        },
      },
    });

    if (existingShare) {
      // Update permission
      const updated = await this.prisma.templateShare.update({
        where: { id: existingShare.id },
        data: { permission: dto.permission ?? SharePermission.USE },
        include: {
          sharedWithTeam: {
            select: { id: true, name: true, slug: true, avatar: true },
          },
        },
      });

      this.logger.log(
        `Updated template share: ${templateId} with team ${dto.teamId}`,
      );
      return updated;
    }

    // Create new share
    const share = await this.prisma.templateShare.create({
      data: {
        templateId,
        sharedWithTeamId: dto.teamId,
        sharedByUserId: sharerUserId,
        permission: dto.permission ?? SharePermission.USE,
      },
      include: {
        sharedWithTeam: {
          select: { id: true, name: true, slug: true, avatar: true },
        },
      },
    });

    // Get sharer name
    const sharer = await this.prisma.user.findUnique({
      where: { id: sharerUserId },
      select: { name: true },
    });
    const sharerName = sharer?.name || 'Someone';

    // Notify team admins/owners
    for (const member of targetTeam.members) {
      await this.notificationService.notifyTemplateShared(
        member.userId,
        sharerName,
        templateId,
        template.name,
        targetTeam.name,
      );
    }

    this.logger.log(
      `Template ${templateId} shared with team ${dto.teamId} by user ${sharerUserId}`,
    );
    return share;
  }

  /**
   * Get templates shared with a team
   */
  async getSharedTemplates(
    teamId: string,
    options?: {
      permission?: SharePermission;
      limit?: number;
      offset?: number;
    },
  ) {
    const where: Prisma.TemplateShareWhereInput = {
      sharedWithTeamId: teamId,
      ...(options?.permission && { permission: options.permission }),
    };

    const [shares, total] = await Promise.all([
      this.prisma.templateShare.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
        include: {
          template: {
            include: {
              createdBy: { select: { id: true, name: true, avatar: true } },
              templateCategory: true,
            },
          },
          sharedWithTeam: {
            select: { id: true, name: true, slug: true, avatar: true },
          },
        },
      }),
      this.prisma.templateShare.count({ where }),
    ]);

    return { shares, total };
  }

  /**
   * Get shares for a specific template
   */
  async getTemplateShares(
    templateId: string,
    ownerTeamId: string,
  ): Promise<TemplateShareWithDetails[]> {
    // Verify ownership
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, teamId: ownerTeamId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.templateShare.findMany({
      where: { templateId },
      include: {
        sharedWithTeam: {
          select: { id: true, name: true, slug: true, avatar: true },
        },
      },
    });
  }

  /**
   * Update share permission
   */
  async updateSharePermission(
    shareId: string,
    ownerUserId: string,
    ownerTeamId: string,
    newPermission: SharePermission,
  ): Promise<TemplateShareWithDetails> {
    const share = await this.prisma.templateShare.findUnique({
      where: { id: shareId },
      include: { template: true },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Verify ownership
    if (share.template.teamId !== ownerTeamId) {
      throw new ForbiddenException('You do not have permission to modify this share');
    }

    const updated = await this.prisma.templateShare.update({
      where: { id: shareId },
      data: { permission: newPermission },
      include: {
        sharedWithTeam: {
          select: { id: true, name: true, slug: true, avatar: true },
        },
      },
    });

    this.logger.log(`Share ${shareId} permission updated to ${newPermission}`);
    return updated;
  }

  /**
   * Remove a template share
   */
  async removeShare(
    shareId: string,
    userId: string,
    teamId: string,
  ): Promise<void> {
    const share = await this.prisma.templateShare.findUnique({
      where: { id: shareId },
      include: { template: true },
    });

    if (!share) {
      throw new NotFoundException('Share not found');
    }

    // Can be removed by template owner or the shared-with team
    const isOwner = share.template.teamId === teamId;
    const isRecipient = share.sharedWithTeamId === teamId;

    if (!isOwner && !isRecipient) {
      throw new ForbiddenException('You do not have permission to remove this share');
    }

    await this.prisma.templateShare.delete({ where: { id: shareId } });

    this.logger.log(`Share ${shareId} removed by user ${userId}`);
  }

  /**
   * Check if a team has access to a template
   */
  async hasAccess(
    templateId: string,
    teamId: string,
    requiredPermission?: SharePermission,
  ): Promise<boolean> {
    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return false;
    }

    // Public templates are accessible to all
    if (template.isPublic) {
      return true;
    }

    // Owner team has full access
    if (template.teamId === teamId) {
      return true;
    }

    // Check share
    const share = await this.prisma.templateShare.findUnique({
      where: {
        templateId_sharedWithTeamId: {
          templateId,
          sharedWithTeamId: teamId,
        },
      },
    });

    if (!share) {
      return false;
    }

    if (!requiredPermission) {
      return true;
    }

    // Check permission level
    const permissionLevels: Record<SharePermission, number> = {
      [SharePermission.USE]: 1,
      [SharePermission.COPY]: 2,
      [SharePermission.EDIT]: 3,
    };

    return permissionLevels[share.permission] >= permissionLevels[requiredPermission];
  }

  /**
   * Revoke all shares for a template
   */
  async revokeAllShares(templateId: string, ownerTeamId: string): Promise<number> {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, teamId: ownerTeamId },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const result = await this.prisma.templateShare.deleteMany({
      where: { templateId },
    });

    this.logger.log(`Revoked ${result.count} shares for template ${templateId}`);
    return result.count;
  }
}
