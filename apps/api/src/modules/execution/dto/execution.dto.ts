import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExecutionStatus } from '@prisma/client';

export class TriggerExecutionDto {
  @ApiProperty({ description: 'Workflow ID to execute' })
  @IsString()
  workflowId: string;

  @ApiPropertyOptional({ description: 'Input data for the workflow' })
  @IsObject()
  @IsOptional()
  inputData?: Record<string, any>;
}

export class ExecutionQueryDto {
  @ApiPropertyOptional({ enum: ExecutionStatus })
  @IsEnum(ExecutionStatus)
  @IsOptional()
  status?: ExecutionStatus;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  skip?: number;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  take?: number;
}
