import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto, TagQueryDto, AssignTagDto } from './dto/tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('teams/:teamId/tags')
@UseGuards(JwtAuthGuard)
export class TagController {
  constructor(private readonly tagService: TagService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Param('teamId') teamId: string,
    @Body() dto: CreateTagDto,
  ) {
    return this.tagService.create(teamId, userId, dto);
  }

  @Get()
  findByTeam(
    @CurrentUser('id') userId: string,
    @Param('teamId') teamId: string,
    @Query() query: TagQueryDto,
  ) {
    return this.tagService.findByTeam(teamId, userId, query);
  }

  @Get(':id')
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tagService.findById(id, userId);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.tagService.update(id, userId, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.tagService.delete(id, userId);
  }

  @Post('assign')
  assignToWorkflow(@CurrentUser('id') userId: string, @Body() dto: AssignTagDto) {
    return this.tagService.assignToWorkflow(dto.workflowId, dto.tagId, userId);
  }

  @Delete('workflow/:workflowId/tag/:tagId')
  removeFromWorkflow(
    @CurrentUser('id') userId: string,
    @Param('workflowId') workflowId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tagService.removeFromWorkflow(workflowId, tagId, userId);
  }

  @Get('workflow/:workflowId')
  getWorkflowTags(
    @CurrentUser('id') userId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.tagService.getWorkflowTags(workflowId, userId);
  }
}
