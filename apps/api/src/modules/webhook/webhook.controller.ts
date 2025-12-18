import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Query,
  Req,
  UseGuards,
  All,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Post('workflow/:workflowId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create webhook for workflow' })
  async create(
    @Param('workflowId') workflowId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.create(workflowId, userId, dto);
  }

  @Get('workflow/:workflowId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List webhooks for workflow' })
  async findByWorkflow(
    @Param('workflowId') workflowId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.findByWorkflow(workflowId, userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update webhook' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete webhook' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.delete(id, userId);
  }

  @Post(':id/regenerate-secret')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  async regenerateSecret(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.regenerateSecret(id, userId);
  }

  // Public webhook endpoint
  @All('hook/:path')
  @Public()
  @ApiOperation({ summary: 'Receive webhook (public endpoint)' })
  async handleWebhook(
    @Param('path') path: string,
    @Req() req: Request,
    @Body() body: any,
    @Headers() headers: Record<string, string>,
    @Query() query: Record<string, string>,
  ) {
    return this.webhookService.handleWebhook(
      path,
      req.method,
      body,
      headers,
      query,
    );
  }
}
