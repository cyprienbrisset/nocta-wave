import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateWebhookDto {
  @ApiPropertyOptional({ description: 'Custom webhook path (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT', 'DELETE', 'ANY'], default: 'POST' })
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'ANY'])
  @IsOptional()
  method?: string;

  @ApiPropertyOptional({ description: 'Custom webhook secret (auto-generated if not provided)' })
  @IsString()
  @IsOptional()
  secret?: string;
}

export class UpdateWebhookDto {
  @ApiPropertyOptional({ enum: ['GET', 'POST', 'PUT', 'DELETE', 'ANY'] })
  @IsIn(['GET', 'POST', 'PUT', 'DELETE', 'ANY'])
  @IsOptional()
  method?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
