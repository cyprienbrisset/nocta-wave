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
  Req,
} from '@nestjs/common';
import { SubWorkflowService } from './subworkflow.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface InputSchemaItem {
  name: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
}

interface OutputSchemaItem {
  name: string;
  type: string;
  label: string;
  description?: string;
}

interface CreateSubWorkflowDto {
  workflowId: string;
  name: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema: InputSchemaItem[];
  outputSchema: OutputSchemaItem[];
  isPublic?: boolean;
  isShared?: boolean;
}

interface UpdateSubWorkflowDto {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  inputSchema?: InputSchemaItem[];
  outputSchema?: OutputSchemaItem[];
  isPublic?: boolean;
  isShared?: boolean;
}

@Controller('subworkflows')
@UseGuards(JwtAuthGuard)
export class SubWorkflowController {
  constructor(private subWorkflowService: SubWorkflowService) {}

  /**
   * Create a sub-workflow from a workflow
   */
  @Post()
  async create(@Body() dto: CreateSubWorkflowDto, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.create(teamId, dto);
  }

  /**
   * Get the sub-workflow library
   */
  @Get('library')
  async getLibrary(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('includePublic') includePublic?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.getLibrary(teamId, {
      category,
      search,
      includePublic: includePublic !== 'false',
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Get available categories
   */
  @Get('categories')
  async getCategories(@Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.getCategories(teamId);
  }

  /**
   * Get a sub-workflow by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.findById(id, teamId);
  }

  /**
   * Get sub-workflow by workflow ID
   */
  @Get('workflow/:workflowId')
  async findByWorkflowId(@Param('workflowId') workflowId: string) {
    return this.subWorkflowService.findByWorkflowId(workflowId);
  }

  /**
   * Update a sub-workflow
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSubWorkflowDto,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.update(teamId, id, dto);
  }

  /**
   * Publish a new version
   */
  @Post(':id/publish')
  async publishVersion(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.publishVersion(teamId, id);
  }

  /**
   * Get version history
   */
  @Get(':id/versions')
  async getVersionHistory(@Param('id') id: string, @Req() req: any) {
    // Get workflowId from subWorkflow
    const subWorkflow = await this.subWorkflowService.findById(id, req.user.currentTeamId);
    return this.subWorkflowService.getVersionHistory(subWorkflow.workflowId);
  }

  /**
   * Get usages of a sub-workflow
   */
  @Get(':id/usages')
  async getUsages(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.getUsages(id, teamId);
  }

  /**
   * Record usage of a sub-workflow in a workflow
   */
  @Post(':id/usage')
  async recordUsage(
    @Param('id') id: string,
    @Body() dto: { parentWorkflowId: string; nodeId: string; versionPinned?: boolean; pinnedVersion?: number },
  ) {
    return this.subWorkflowService.recordUsage(
      id,
      dto.parentWorkflowId,
      dto.nodeId,
      {
        versionPinned: dto.versionPinned,
        pinnedVersion: dto.pinnedVersion,
      },
    );
  }

  /**
   * Remove usage record
   */
  @Delete('usage/:parentWorkflowId/:nodeId')
  async removeUsage(
    @Param('parentWorkflowId') parentWorkflowId: string,
    @Param('nodeId') nodeId: string,
  ) {
    return this.subWorkflowService.removeUsage(parentWorkflowId, nodeId);
  }

  /**
   * Delete a sub-workflow
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.subWorkflowService.delete(teamId, id);
  }

  /**
   * Validate input data against sub-workflow schema
   */
  @Post(':id/validate')
  async validateInput(
    @Param('id') id: string,
    @Body() dto: { inputData: Record<string, unknown> },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const subWorkflow = await this.subWorkflowService.findById(id, teamId);
    return this.subWorkflowService.validateInput(
      dto.inputData,
      subWorkflow.inputSchema as any[],
    );
  }
}
