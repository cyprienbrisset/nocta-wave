import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FavoritesService } from './favorites.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    teamIds: string[];
  };
}

@ApiTags('favorites')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'Get user favorite workflows' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getFavorites(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.favoritesService.getFavorites(req.user.id, req.user.teamIds, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get user recent workflows' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getRecentWorkflows(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.favoritesService.getRecentWorkflows(req.user.id, req.user.teamIds, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(':workflowId/status')
  @ApiOperation({ summary: 'Check if workflow is favorited' })
  async isFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('workflowId') workflowId: string,
  ) {
    const isFavorite = await this.favoritesService.isFavorite(req.user.id, workflowId);
    return { isFavorite };
  }

  @Post(':workflowId')
  @ApiOperation({ summary: 'Add workflow to favorites' })
  async addFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('workflowId') workflowId: string,
  ) {
    await this.favoritesService.addFavorite(req.user.id, workflowId);
    return { message: 'Workflow added to favorites' };
  }

  @Delete(':workflowId')
  @ApiOperation({ summary: 'Remove workflow from favorites' })
  async removeFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('workflowId') workflowId: string,
  ) {
    await this.favoritesService.removeFavorite(req.user.id, workflowId);
    return { message: 'Workflow removed from favorites' };
  }

  @Post(':workflowId/toggle')
  @ApiOperation({ summary: 'Toggle workflow favorite status' })
  async toggleFavorite(
    @Req() req: AuthenticatedRequest,
    @Param('workflowId') workflowId: string,
  ) {
    const isFavorite = await this.favoritesService.toggleFavorite(
      req.user.id,
      workflowId,
    );
    return { isFavorite };
  }

  @Post(':workflowId/access')
  @ApiOperation({ summary: 'Record workflow access' })
  async recordAccess(
    @Req() req: AuthenticatedRequest,
    @Param('workflowId') workflowId: string,
  ) {
    await this.favoritesService.recordAccess(req.user.id, workflowId);
    return { message: 'Access recorded' };
  }
}
