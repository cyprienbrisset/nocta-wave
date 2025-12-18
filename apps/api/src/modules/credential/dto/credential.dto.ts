import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsObject,
  IsEnum,
} from 'class-validator';
import { CredentialType } from '@prisma/client';

export class CreateCredentialDto {
  @ApiProperty({ example: 'My API Key' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: CredentialType, example: 'API_KEY' })
  @IsEnum(CredentialType)
  type: CredentialType;

  @ApiProperty({
    description: 'Credential data (will be encrypted)',
    example: { apiKey: 'sk-xxx', baseUrl: 'https://api.example.com' },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { service: 'openai' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateCredentialDto {
  @ApiPropertyOptional({ example: 'Updated API Key Name' })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated credential data (will be encrypted)',
  })
  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
