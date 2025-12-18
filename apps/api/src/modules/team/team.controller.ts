import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TeamService } from './team.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
} from './dto/team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('teams')
@Controller('teams')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new team' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get user teams' })
  async getUserTeams(@CurrentUser('id') userId: string) {
    return this.teamService.getUserTeams(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team by ID' })
  async getTeam(@Param('id') id: string) {
    return this.teamService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete team' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamService.delete(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Get team members' })
  async getMembers(@Param('id') id: string) {
    return this.teamService.getMembers(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Invite member to team' })
  async inviteMember(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamService.inviteMember(id, userId, dto);
  }

  @Put(':id/members/:memberId')
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamService.updateMemberRole(id, userId, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove member from team' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamService.removeMember(id, userId, memberId);
  }

  @Post(':id/leave')
  @ApiOperation({ summary: 'Leave team' })
  async leaveTeam(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.teamService.leaveTeam(id, userId);
  }
}
