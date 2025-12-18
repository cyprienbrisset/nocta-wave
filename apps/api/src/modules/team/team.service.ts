import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamRole } from '@prisma/client';
import { CreateTeamDto, UpdateTeamDto, InviteMemberDto } from './dto/team.dto';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTeamDto) {
    // Generate unique slug
    let slug = dto.slug || this.generateSlug(dto.name);
    const existingSlug = await this.prisma.team.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: dto.name,
          slug,
          avatar: dto.avatar,
        },
      });

      // Add creator as owner
      await tx.teamMember.create({
        data: {
          userId,
          teamId: team.id,
          role: 'OWNER',
        },
      });

      return team;
    });
  }

  async findById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            workflows: true,
            credentials: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async findBySlug(slug: string) {
    const team = await this.prisma.team.findUnique({
      where: { slug },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async getUserTeams(userId: string) {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            _count: {
              select: {
                members: true,
                workflows: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.team,
      role: m.role,
    }));
  }

  async update(teamId: string, userId: string, dto: UpdateTeamDto) {
    await this.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN']);

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: dto.name,
        avatar: dto.avatar,
      },
    });
  }

  async delete(teamId: string, userId: string) {
    await this.checkTeamAccess(teamId, userId, ['OWNER']);

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { message: 'Team deleted successfully' };
  }

  async getMembers(teamId: string) {
    return this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async inviteMember(teamId: string, userId: string, dto: InviteMemberDto) {
    await this.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN']);

    // Find user by email
    const invitedUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already a member
    const existingMember = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: invitedUser.id,
          teamId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a team member');
    }

    return this.prisma.teamMember.create({
      data: {
        userId: invitedUser.id,
        teamId,
        role: dto.role || 'MEMBER',
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    teamId: string,
    userId: string,
    memberId: string,
    role: TeamRole,
  ) {
    await this.checkTeamAccess(teamId, userId, ['OWNER']);

    // Cannot change owner role
    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot change owner role');
    }

    return this.prisma.teamMember.update({
      where: { id: memberId },
      data: { role },
    });
  }

  async removeMember(teamId: string, userId: string, memberId: string) {
    await this.checkTeamAccess(teamId, userId, ['OWNER', 'ADMIN']);

    const member = await this.prisma.teamMember.findUnique({
      where: { id: memberId },
    });

    if (!member || member.teamId !== teamId) {
      throw new NotFoundException('Member not found');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove team owner');
    }

    await this.prisma.teamMember.delete({
      where: { id: memberId },
    });

    return { message: 'Member removed successfully' };
  }

  async leaveTeam(teamId: string, userId: string) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!member) {
      throw new NotFoundException('Not a team member');
    }

    if (member.role === 'OWNER') {
      throw new ForbiddenException(
        'Owner cannot leave team. Transfer ownership first.',
      );
    }

    await this.prisma.teamMember.delete({
      where: { id: member.id },
    });

    return { message: 'Left team successfully' };
  }

  async checkTeamAccess(
    teamId: string,
    userId: string,
    requiredRoles: TeamRole[],
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: {
        userId_teamId: { userId, teamId },
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a team member');
    }

    if (!requiredRoles.includes(member.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return member;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
