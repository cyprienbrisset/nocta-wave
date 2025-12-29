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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DebugService, StepMode } from './debug.service';

interface AuthenticatedRequest {
  user: {
    id: string;
    teamIds: string[];
  };
}

@ApiTags('debug')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('debug')
export class DebugController {
  constructor(private readonly debugService: DebugService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Start a debug session' })
  async startSession(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      executionId: string;
      workflowId: string;
      breakpoints?: Array<{
        nodeId: string;
        enabled: boolean;
        condition?: string;
        hitCount?: number;
        logMessage?: string;
      }>;
    },
  ) {
    return this.debugService.startDebugSession(
      body.executionId,
      body.workflowId,
      req.user.id,
      body.breakpoints,
    );
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get debug session' })
  async getSession(@Param('sessionId') sessionId: string) {
    const session = this.debugService.getSession(sessionId);
    if (!session) {
      return { error: 'Session not found' };
    }
    return session;
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get user debug sessions' })
  async getUserSessions(@Req() req: AuthenticatedRequest) {
    return this.debugService.getUserSessions(req.user.id);
  }

  @Post('sessions/:sessionId/breakpoints')
  @ApiOperation({ summary: 'Add a breakpoint' })
  async addBreakpoint(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      nodeId: string;
      condition?: string;
      hitCount?: number;
      logMessage?: string;
    },
  ) {
    return this.debugService.addBreakpoint(sessionId, body.nodeId, {
      condition: body.condition,
      hitCount: body.hitCount,
      logMessage: body.logMessage,
    });
  }

  @Delete('sessions/:sessionId/breakpoints/:breakpointId')
  @ApiOperation({ summary: 'Remove a breakpoint' })
  async removeBreakpoint(
    @Param('sessionId') sessionId: string,
    @Param('breakpointId') breakpointId: string,
  ) {
    this.debugService.removeBreakpoint(sessionId, breakpointId);
    return { success: true };
  }

  @Put('sessions/:sessionId/breakpoints/:breakpointId/toggle')
  @ApiOperation({ summary: 'Toggle breakpoint enabled state' })
  async toggleBreakpoint(
    @Param('sessionId') sessionId: string,
    @Param('breakpointId') breakpointId: string,
  ) {
    return this.debugService.toggleBreakpoint(sessionId, breakpointId);
  }

  @Post('sessions/:sessionId/resume')
  @ApiOperation({ summary: 'Resume execution' })
  async resume(
    @Param('sessionId') sessionId: string,
    @Body() body: { mode?: StepMode },
  ) {
    this.debugService.resume(sessionId, body.mode || 'continue');
    return { success: true };
  }

  @Post('sessions/:sessionId/step-over')
  @ApiOperation({ summary: 'Step over to next node' })
  async stepOver(@Param('sessionId') sessionId: string) {
    this.debugService.stepOver(sessionId);
    return { success: true };
  }

  @Post('sessions/:sessionId/step-into')
  @ApiOperation({ summary: 'Step into sub-workflow' })
  async stepInto(@Param('sessionId') sessionId: string) {
    this.debugService.stepInto(sessionId);
    return { success: true };
  }

  @Post('sessions/:sessionId/step-out')
  @ApiOperation({ summary: 'Step out of sub-workflow' })
  async stepOut(@Param('sessionId') sessionId: string) {
    this.debugService.stepOut(sessionId);
    return { success: true };
  }

  @Put('sessions/:sessionId/modify')
  @ApiOperation({ summary: 'Modify data during debug' })
  async modifyData(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      nodeId: string;
      path: string;
      value: any;
    },
  ) {
    this.debugService.modifyData(sessionId, body.nodeId, body.path, body.value);
    return { success: true };
  }

  @Post('sessions/:sessionId/end')
  @ApiOperation({ summary: 'End debug session' })
  async endSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { state?: 'finished' | 'error' },
  ) {
    this.debugService.endSession(sessionId, body.state || 'finished');
    return { success: true };
  }

  @Post('replay')
  @ApiOperation({ summary: 'Replay an execution with modifications' })
  async replayExecution(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      executionId: string;
      modifications?: Record<string, any>;
    },
  ) {
    return this.debugService.replayExecution(
      body.executionId,
      req.user.id,
      body.modifications,
    );
  }

  @Get('executions/:workflowId/replayable')
  @ApiOperation({ summary: 'Get replayable executions for a workflow' })
  async getReplayableExecutions(
    @Param('workflowId') workflowId: string,
    @Query('limit') limit?: string,
  ) {
    return this.debugService.getReplayableExecutions(
      workflowId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }
}
