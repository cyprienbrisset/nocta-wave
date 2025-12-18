import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExecutionService } from './execution.service';
import { TriggerExecutionDto, ExecutionQueryDto } from './dto/execution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('executions')
@Controller('executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Trigger a workflow execution' })
  async trigger(
    @CurrentUser('id') userId: string,
    @Body() dto: TriggerExecutionDto,
  ) {
    return this.executionService.trigger(
      dto.workflowId,
      userId,
      'MANUAL',
      dto.inputData,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List executions for current team' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
    @Query() query: ExecutionQueryDto,
  ) {
    return this.executionService.findByTeam(teamId, userId, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get execution statistics' })
  async getStats(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
  ) {
    return this.executionService.getStats(teamId, userId);
  }

  @Get('workflow/:workflowId')
  @ApiOperation({ summary: 'List executions for a workflow' })
  async findByWorkflow(
    @Param('workflowId') workflowId: string,
    @CurrentUser('id') userId: string,
    @Query() query: ExecutionQueryDto,
  ) {
    return this.executionService.findByWorkflow(workflowId, userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get execution by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.executionService.findById(id, userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel execution' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.executionService.cancel(id, userId);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry failed execution' })
  async retry(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.executionService.retry(id, userId);
  }
}
