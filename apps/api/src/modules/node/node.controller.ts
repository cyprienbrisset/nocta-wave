import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NodeService } from './node.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('nodes')
@Controller('nodes')
export class NodeController {
  constructor(private readonly nodeService: NodeService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all available nodes' })
  getAll() {
    return this.nodeService.getAll();
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get nodes grouped by category' })
  getByCategory() {
    return this.nodeService.getByCategory();
  }

  @Get('counts')
  @Public()
  @ApiOperation({ summary: 'Get node counts by category' })
  getCounts() {
    return this.nodeService.getCounts();
  }

  @Get('search')
  @Public()
  @ApiOperation({ summary: 'Search nodes' })
  search(@Query('q') query: string) {
    return this.nodeService.search(query || '');
  }

  @Get(':type')
  @Public()
  @ApiOperation({ summary: 'Get node by type' })
  getByType(@Param('type') type: string) {
    return this.nodeService.getByType(type);
  }
}
