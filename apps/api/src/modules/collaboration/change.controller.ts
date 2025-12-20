import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeService } from './change.service';
import { ChangeType } from '@prisma/client';

@ApiTags('Workflow Changes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows/:workflowId/changes')
export class ChangeController {
  constructor(private changeService: ChangeService) {}

  @Get()
  @ApiOperation({ summary: 'Get recent changes for a workflow' })
  async getRecentChanges(
    @Param('workflowId') workflowId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('since') since?: string,
    @Query('types') types?: string,
  ) {
    return this.changeService.getRecentChanges(workflowId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      since: since ? new Date(since) : undefined,
      changeTypes: types ? (types.split(',') as ChangeType[]) : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get change statistics for a workflow' })
  async getChangeStats(@Param('workflowId') workflowId: string) {
    return this.changeService.getChangeStats(workflowId);
  }

  @Get('node/:nodeId')
  @ApiOperation({ summary: 'Get changes for a specific node' })
  async getNodeChanges(
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
    @Query('limit') limit?: string,
  ) {
    return this.changeService.getNodeChanges(
      workflowId,
      nodeId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get changes by a specific user' })
  async getUserChanges(
    @Param('workflowId') workflowId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    return this.changeService.getUserChanges(
      workflowId,
      userId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
