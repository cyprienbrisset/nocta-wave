import {
  Controller,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { NodeCacheService } from './node-cache.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('cache')
@UseGuards(JwtAuthGuard)
export class CacheController {
  constructor(private cacheService: NodeCacheService) {}

  @Get('workflow/:workflowId/stats')
  async getWorkflowCacheStats(@Param('workflowId') workflowId: string) {
    return this.cacheService.getStats(workflowId);
  }

  @Delete('workflow/:workflowId')
  async invalidateWorkflowCache(@Param('workflowId') workflowId: string) {
    const count = await this.cacheService.invalidateWorkflow(workflowId);
    return { success: true, invalidated: count };
  }

  @Delete('workflow/:workflowId/node/:nodeId')
  async invalidateNodeCache(
    @Param('workflowId') workflowId: string,
    @Param('nodeId') nodeId: string,
  ) {
    const count = await this.cacheService.invalidateNode(workflowId, nodeId);
    return { success: true, invalidated: count };
  }

  @Delete('cleanup')
  async cleanupExpiredCache() {
    const count = await this.cacheService.cleanup();
    return { success: true, cleaned: count };
  }
}
