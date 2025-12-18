import { IsString, IsOptional, IsBoolean, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PositionDto {
  x: number;
  y: number;
}

export class CreateCommentDto {
  @IsUUID()
  workflowId: string;

  @IsOptional()
  @IsString()
  nodeId?: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;
}

export class CommentQueryDto {
  @IsOptional()
  @IsUUID()
  workflowId?: string;

  @IsOptional()
  @IsString()
  nodeId?: string;

  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
