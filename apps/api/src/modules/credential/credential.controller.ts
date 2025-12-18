import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CredentialService } from './credential.service';
import { CreateCredentialDto, UpdateCredentialDto } from './dto/credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('credentials')
@Controller('credentials')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new credential' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
    @Body() dto: CreateCredentialDto,
  ) {
    return this.credentialService.create(userId, teamId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List credentials for current team' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('currentTeamId') teamId: string,
  ) {
    return this.credentialService.findByTeam(teamId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential by ID (without sensitive data)' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.credentialService.findById(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update credential' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCredentialDto,
  ) {
    return this.credentialService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credential' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.credentialService.delete(id, userId);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Test credential connectivity' })
  async test(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.credentialService.testCredential(id, userId);
  }
}
