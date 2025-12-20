import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CursorPositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class ViewportStateDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  zoom: number;
}

export class JoinWorkflowDto {
  @IsString()
  workflowId: string;
}

export class LeaveWorkflowDto {
  @IsString()
  workflowId: string;
}

export class CursorMoveDto {
  @IsString()
  workflowId: string;

  @ValidateNested()
  @Type(() => CursorPositionDto)
  position: CursorPositionDto;
}

export class ViewportUpdateDto {
  @IsString()
  workflowId: string;

  @ValidateNested()
  @Type(() => ViewportStateDto)
  viewport: ViewportStateDto;
}

export class ChatMessageDto {
  @IsString()
  workflowId: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsString()
  @IsOptional()
  nodeId?: string;
}

export class TypingDto {
  @IsString()
  workflowId: string;

  @IsBoolean()
  isTyping: boolean;
}

export class FollowDto {
  @IsString()
  workflowId: string;

  @IsString()
  targetUserId: string;
}

export class StopFollowDto {
  @IsString()
  workflowId: string;
}

export class WorkflowChangeDto {
  @IsString()
  workflowId: string;

  @IsEnum(['NODE_ADDED', 'NODE_UPDATED', 'NODE_DELETED', 'NODE_MOVED',
           'EDGE_ADDED', 'EDGE_DELETED', 'CONFIG_CHANGED', 'SETTINGS_CHANGED'])
  changeType: string;

  @IsString()
  @IsOptional()
  nodeId?: string;

  @IsString()
  @IsOptional()
  edgeId?: string;

  @IsObject()
  @IsOptional()
  previousData?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  newData?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  description?: string;
}
