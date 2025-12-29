import { IsString, IsOptional, IsBoolean, IsArray, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to notify' })
  @IsString()
  userId: string;

  @ApiProperty({ enum: NotificationType, description: 'Notification type' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Additional data (workflowId, commentId, etc.)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, unknown>;
}

export class MarkNotificationsReadDto {
  @ApiProperty({ description: 'Notification IDs to mark as read', type: [String] })
  @IsArray()
  @IsString({ each: true })
  notificationIds: string[];
}

export class GetNotificationsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  read?: boolean;

  @ApiPropertyOptional({ description: 'Filter by notification type', enum: NotificationType })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Number of notifications to return', default: 20 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  offset?: number;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: Record<string, unknown>;

  @ApiProperty()
  read: boolean;

  @ApiPropertyOptional()
  readAt?: Date;

  @ApiProperty()
  createdAt: Date;
}

export class NotificationCountDto {
  @ApiProperty({ description: 'Total unread notifications' })
  unread: number;

  @ApiProperty({ description: 'Unread count by type' })
  byType: Record<string, number>;
}
