import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CollaborationLinkService, CreateLinkDto } from './collaboration-link.service';
import { CollaborationPermission } from '@prisma/client';

@ApiTags('Collaboration Links')
@Controller('collaboration-links')
export class CollaborationLinkController {
  constructor(private linkService: CollaborationLinkService) {}

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new collaboration link' })
  async createLink(
    @Body()
    body: {
      workflowId: string;
      name?: string;
      permission?: CollaborationPermission;
      maxUses?: number;
      expiresInHours?: number;
    },
    @Request() req: any,
  ) {
    return this.linkService.createLink(req.user.id, body);
  }

  @Get('workflow/:workflowId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all collaboration links for a workflow' })
  async getLinksForWorkflow(
    @Param('workflowId') workflowId: string,
    @Request() req: any,
  ) {
    return this.linkService.getLinksForWorkflow(workflowId, req.user.id);
  }

  @Get('validate/:token')
  @Public()
  @ApiOperation({ summary: 'Get link info (public - for preview)' })
  async getLinkInfo(@Param('token') token: string) {
    return this.linkService.getLinkInfo(token);
  }

  @Post('join/:token')
  @Public()
  @ApiOperation({ summary: 'Join as guest via collaboration link' })
  async joinAsGuest(
    @Param('token') token: string,
    @Body() body: { guestName: string },
  ) {
    return this.linkService.validateLink(token, body.guestName);
  }

  @Delete(':linkId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete a collaboration link' })
  async deleteLink(@Param('linkId') linkId: string, @Request() req: any) {
    await this.linkService.deleteLink(linkId, req.user.id);
    return { success: true };
  }

  @Post(':linkId/deactivate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Deactivate a collaboration link' })
  async deactivateLink(@Param('linkId') linkId: string, @Request() req: any) {
    await this.linkService.deactivateLink(linkId, req.user.id);
    return { success: true };
  }

  @Get('guest/:sessionId/workflow')
  @Public()
  @ApiOperation({ summary: 'Get workflow data for a guest session' })
  async getWorkflowForGuest(@Param('sessionId') sessionId: string) {
    return this.linkService.getWorkflowForGuest(sessionId);
  }
}
