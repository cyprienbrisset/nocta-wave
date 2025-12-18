import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowQueryDto,
} from './dto/workflow.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowService.create(userId, teamId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List workflows for current team' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
    @Query() query: WorkflowQueryDto,
  ) {
    return this.workflowService.findByTeam(teamId, userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workflow by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.findById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update workflow' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workflow' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.delete(id, userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate workflow' })
  async duplicate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.duplicate(id, userId);
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate workflow' })
  async activate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.activate(id, userId);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate workflow' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.deactivate(id, userId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get workflow versions' })
  async getVersions(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.getVersions(id, userId);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore workflow version' })
  async restoreVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.restoreVersion(id, versionId, userId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export workflow as JSON' })
  async exportWorkflow(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.exportWorkflow(id, userId);
  }

  @Post('import')
  @ApiOperation({ summary: 'Import workflow from JSON' })
  async importWorkflow(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
    @Body() data: any,
  ) {
    return this.workflowService.importWorkflow(userId, teamId, data);
  }

  @Get(':id/versions/:versionId')
  @ApiOperation({ summary: 'Get specific workflow version' })
  async getVersion(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.getVersion(id, versionId, userId);
  }

  @Get(':id/versions/:versionId/diff')
  @ApiOperation({ summary: 'Get diff between workflow version and current' })
  async getVersionDiff(
    @Param('id') id: string,
    @Param('versionId') versionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.workflowService.getVersionDiff(id, versionId, userId);
  }
}
