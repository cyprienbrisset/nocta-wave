import { IsString, IsOptional, IsUUID, IsHexColor, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class UpdateTagDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;
}

export class AssignTagDto {
  @IsUUID()
  workflowId: string;

  @IsUUID()
  tagId: string;
}

export class TagQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
