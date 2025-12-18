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
import { TemplateService } from './template.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  CreateWorkflowFromTemplateDto,
} from './dto/template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTemplateDto,
    @Query('teamId') teamId?: string,
  ) {
    return this.templateService.create(teamId || null, userId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('teamId') teamId?: string,
    @Query() query?: TemplateQueryDto,
  ) {
    return this.templateService.findAll(userId, teamId, query);
  }

  @Get('categories')
  getCategories() {
    return this.templateService.getCategories();
  }

  @Get(':id')
  findById(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.templateService.findById(id, userId);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(id, userId, dto);
  }

  @Delete(':id')
  delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.templateService.delete(id, userId);
  }

  @Post(':id/use')
  createWorkflowFromTemplate(
    @CurrentUser('id') userId: string,
    @Param('id') templateId: string,
    @Query('teamId') teamId: string,
    @Body() dto: CreateWorkflowFromTemplateDto,
  ) {
    return this.templateService.createWorkflowFromTemplate(
      templateId,
      teamId,
      userId,
      dto,
    );
  }

  @Post('from-workflow/:workflowId')
  createFromWorkflow(
    @CurrentUser('id') userId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: Partial<CreateTemplateDto>,
  ) {
    return this.templateService.createFromWorkflow(workflowId, userId, dto);
  }
}
