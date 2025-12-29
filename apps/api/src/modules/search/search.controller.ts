import {
  Controller,
  Get,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService, SearchQuery } from './search.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    teamIds: string[];
  };
}

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across workflows, templates, and nodes' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'types', required: false, description: 'Types to search: workflow,template,node' })
  @ApiQuery({ name: 'teamId', required: false, description: 'Filter by team ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async search(
    @Req() req: AuthenticatedRequest,
    @Query('q') query: string,
    @Query('types') types?: string,
    @Query('teamId') teamId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const searchQuery: SearchQuery = {
      query,
      types: types ? (types.split(',') as ('workflow' | 'template' | 'node')[]) : undefined,
      teamId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    return this.searchService.search(req.user.id, req.user.teamIds, searchQuery);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions for autocomplete' })
  @ApiQuery({ name: 'prefix', required: true, description: 'Search prefix' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSuggestions(
    @Req() req: AuthenticatedRequest,
    @Query('prefix') prefix: string,
    @Query('limit') limit?: string,
  ) {
    const suggestions = await this.searchService.getSuggestions(
      req.user.id,
      req.user.teamIds,
      prefix,
      limit ? parseInt(limit, 10) : undefined,
    );
    return { suggestions };
  }
}
