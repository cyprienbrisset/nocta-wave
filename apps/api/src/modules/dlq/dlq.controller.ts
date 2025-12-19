import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DeadLetterQueueService } from './dlq.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DLQStatus } from '@prisma/client';

@Controller('dlq')
@UseGuards(JwtAuthGuard)
export class DLQController {
  constructor(private dlqService: DeadLetterQueueService) {}

  @Get()
  async getEntries(
    @Req() req: any,
    @Query('status') status?: DLQStatus,
    @Query('workflowId') workflowId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.dlqService.getEntries(teamId, {
      status,
      workflowId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get('stats')
  async getStats(@Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.dlqService.getStats(teamId);
  }

  @Post(':id/retry')
  async retryEntry(@Param('id') id: string) {
    return this.dlqService.retryEntry(id);
  }

  @Post('workflow/:workflowId/retry-all')
  async retryAllForWorkflow(
    @Param('workflowId') workflowId: string,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.dlqService.retryAllForWorkflow(teamId, workflowId);
  }

  @Put(':id/resolve')
  async markResolved(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    await this.dlqService.markResolved(id, userId);
    return { success: true };
  }

  @Put(':id/discard')
  async discardEntry(@Param('id') id: string) {
    await this.dlqService.discardEntry(id);
    return { success: true };
  }
}
