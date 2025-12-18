import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsUrl,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { TeamRole } from '@prisma/client';

export class CreateTeamDto {
  @ApiProperty({ example: 'My Team' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'my-team' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  slug?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsUrl()
  @IsOptional()
  avatar?: string;
}

export class UpdateTeamDto {
  @ApiPropertyOptional({ example: 'Updated Team Name' })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsUrl()
  @IsOptional()
  avatar?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ enum: TeamRole, example: 'MEMBER' })
  @IsEnum(TeamRole)
  @IsOptional()
  role?: TeamRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: TeamRole, example: 'ADMIN' })
  @IsEnum(TeamRole)
  role: TeamRole;
}
