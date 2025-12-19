import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { StreamingService, StreamProgress } from './streaming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('streaming')
@UseGuards(JwtAuthGuard)
export class StreamingController {
  constructor(private streamingService: StreamingService) {}

  @Get('progress/:streamId')
  getProgress(@Param('streamId') streamId: string): StreamProgress | { error: string } {
    const progress = this.streamingService.getProgress(streamId);
    if (!progress) {
      return { error: 'Stream not found' };
    }
    return progress;
  }

  @Get('sse/:streamId')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  streamProgress(
    @Param('streamId') streamId: string,
    @Res() res: Response,
  ) {
    const stream = this.streamingService.createSSEStream(streamId);

    // Send initial progress if available
    const currentProgress = this.streamingService.getProgress(streamId);
    if (currentProgress) {
      res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
    }

    // Pipe the stream to response
    stream.pipe(res);

    // Cleanup on client disconnect
    res.on('close', () => {
      stream.destroy();
    });
  }

  @Get('execution/:executionId/logs')
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache')
  @Header('Connection', 'keep-alive')
  async streamExecutionLogs(
    @Param('executionId') executionId: string,
    @Res() res: Response,
  ) {
    try {
      for await (const log of this.streamingService.streamExecutionLogs(executionId)) {
        res.write(`data: ${JSON.stringify(log)}\n\n`);
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: (error as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }
}
