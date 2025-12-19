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
import { EnvironmentService } from './environment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { VariableType } from '@prisma/client';

@Controller('environments')
@UseGuards(JwtAuthGuard)
export class EnvironmentController {
  constructor(private environmentService: EnvironmentService) {}

  // ============================================================================
  // ENVIRONMENTS
  // ============================================================================

  /**
   * Get all environments
   */
  @Get()
  async getEnvironments(@Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.getEnvironments(teamId);
  }

  /**
   * Create default environments
   */
  @Post('defaults')
  async createDefaults(@Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.createDefaultEnvironments(teamId);
  }

  /**
   * Create a new environment
   */
  @Post()
  async createEnvironment(
    @Body()
    dto: {
      name: string;
      slug: string;
      description?: string;
      color?: string;
      order?: number;
      isDefault?: boolean;
      isProduction?: boolean;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.createEnvironment(teamId, dto);
  }

  /**
   * Update an environment
   */
  @Put(':id')
  async updateEnvironment(
    @Param('id') id: string,
    @Body()
    dto: {
      name?: string;
      description?: string;
      color?: string;
      order?: number;
      isDefault?: boolean;
      isProduction?: boolean;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.updateEnvironment(id, teamId, dto);
  }

  /**
   * Delete an environment
   */
  @Delete(':id')
  async deleteEnvironment(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.deleteEnvironment(id, teamId);
  }

  // ============================================================================
  // VARIABLES
  // ============================================================================

  /**
   * Get all variables
   */
  @Get('variables')
  async getVariables(
    @Req() req: any,
    @Query('environmentId') environmentId?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.getVariables(teamId, environmentId);
  }

  /**
   * Get variable by ID
   */
  @Get('variables/:id')
  async getVariableById(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.getVariableById(id, teamId);
  }

  /**
   * Create a new variable
   */
  @Post('variables')
  async createVariable(
    @Body()
    dto: {
      key: string;
      description?: string;
      type?: VariableType;
      isSecret?: boolean;
      isGlobal?: boolean;
      values?: Array<{
        environmentId: string;
        value: string;
      }>;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.createVariable(teamId, dto);
  }

  /**
   * Update a variable
   */
  @Put('variables/:id')
  async updateVariable(
    @Param('id') id: string,
    @Body()
    dto: {
      description?: string;
      type?: VariableType;
      isGlobal?: boolean;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.updateVariable(id, teamId, dto);
  }

  /**
   * Set variable value for an environment
   */
  @Post('variables/:id/value')
  async setVariableValue(
    @Param('id') variableId: string,
    @Body() dto: { environmentId: string; value: string },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.setVariableValue(teamId, {
      variableId,
      ...dto,
    });
  }

  /**
   * Delete a variable
   */
  @Delete('variables/:id')
  async deleteVariable(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.deleteVariable(id, teamId);
  }

  // ============================================================================
  // PROMOTIONS
  // ============================================================================

  /**
   * Promote variables between environments
   */
  @Post('promote')
  async promoteVariables(
    @Body()
    dto: {
      sourceEnvId: string;
      targetEnvId: string;
      variableIds?: string[];
      changelog?: string;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.environmentService.promoteVariables(teamId, userId, dto);
  }

  /**
   * Approve a promotion
   */
  @Post('promotions/:id/approve')
  async approvePromotion(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.environmentService.approvePromotion(id, teamId, userId);
  }

  /**
   * Reject a promotion
   */
  @Post('promotions/:id/reject')
  async rejectPromotion(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.rejectPromotion(id, teamId);
  }

  /**
   * Get promotion history
   */
  @Get('promotions')
  async getPromotionHistory(
    @Req() req: any,
    @Query('limit') limit?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.environmentService.getPromotionHistory(
      teamId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
