import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import {
  GetNotificationsQueryDto,
  MarkNotificationsReadDto,
  NotificationResponseDto,
  NotificationCountDto,
} from './notification.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, description: 'Notifications list', type: [NotificationResponseDto] })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: GetNotificationsQueryDto,
  ) {
    return this.notificationService.getNotifications(userId, {
      read: query.read,
      type: query.type,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count', type: NotificationCountDto })
  async getUnreadCount(@CurrentUser('id') userId: string): Promise<NotificationCountDto> {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark specific notifications as read' })
  @ApiResponse({ status: 200, description: 'Number of notifications marked as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Body() dto: MarkNotificationsReadDto,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.markManyAsRead(dto.notificationIds, userId);
    return { count };
  }

  @Post('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'Number of notifications marked as read' })
  async markAllAsRead(@CurrentUser('id') userId: string): Promise<{ count: number }> {
    const count = await this.notificationService.markAllAsRead(userId);
    return { count };
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a single notification as read' })
  @ApiResponse({ status: 200, description: 'Updated notification', type: NotificationResponseDto })
  async markSingleAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationService.markAsRead(notificationId, userId);
    return notification as NotificationResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 204, description: 'Notification deleted' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ): Promise<void> {
    await this.notificationService.delete(notificationId, userId);
  }
}
