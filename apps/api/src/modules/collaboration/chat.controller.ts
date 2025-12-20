import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workflows/:workflowId/chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  @ApiOperation({ summary: 'Get chat messages for a workflow' })
  async getMessages(
    @Param('workflowId') workflowId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('parentId') parentId?: string,
    @Query('nodeId') nodeId?: string,
    @Request() req?: any,
  ) {
    return this.chatService.getMessages(workflowId, req.user.id, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      parentId: parentId === 'null' ? null : parentId,
      nodeId,
    });
  }

  @Get('thread/:parentId')
  @ApiOperation({ summary: 'Get thread replies' })
  async getThreadReplies(
    @Param('workflowId') workflowId: string,
    @Param('parentId') parentId: string,
    @Request() req: any,
  ) {
    return this.chatService.getThreadReplies(workflowId, parentId, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  async sendMessage(
    @Param('workflowId') workflowId: string,
    @Body() body: { content: string; parentId?: string; nodeId?: string },
    @Request() req: any,
  ) {
    return this.chatService.createMessage(
      workflowId,
      req.user.id,
      body.content,
      body.parentId,
      body.nodeId,
    );
  }

  @Patch(':messageId')
  @ApiOperation({ summary: 'Edit a chat message' })
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() body: { content: string },
    @Request() req: any,
  ) {
    return this.chatService.editMessage(messageId, req.user.id, body.content);
  }

  @Delete(':messageId')
  @ApiOperation({ summary: 'Delete a chat message' })
  async deleteMessage(
    @Param('messageId') messageId: string,
    @Request() req: any,
  ) {
    await this.chatService.deleteMessage(messageId, req.user.id);
    return { success: true };
  }

  @Get('mentions/unread')
  @ApiOperation({ summary: 'Get unread mentions' })
  async getUnreadMentions(
    @Param('workflowId') workflowId: string,
    @Request() req: any,
  ) {
    return this.chatService.getUnreadMentions(req.user.id, workflowId);
  }

  @Get('mentions/count')
  @ApiOperation({ summary: 'Get unread mention count' })
  async getUnreadMentionCount(
    @Param('workflowId') workflowId: string,
    @Request() req: any,
  ) {
    const count = await this.chatService.getUnreadMentionCount(req.user.id, workflowId);
    return { count };
  }

  @Post('mentions/read')
  @ApiOperation({ summary: 'Mark mentions as read' })
  async markMentionsAsRead(
    @Body() body: { mentionIds: string[] },
    @Request() req: any,
  ) {
    await this.chatService.markMentionsAsRead(req.user.id, body.mentionIds);
    return { success: true };
  }
}
