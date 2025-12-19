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
  Req,
} from '@nestjs/common';
import { TemplateService } from './template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { TemplateDifficulty, Prisma } from '@prisma/client';

interface CreateTemplateDto {
  name: string;
  description?: string;
  longDescription?: string;
  category: string;
  categoryId?: string;
  icon?: string;
  thumbnail?: string;
  graph: Record<string, unknown>;
  settings?: Record<string, unknown>;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  estimatedTime?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
  parameters?: Array<{
    name: string;
    label: string;
    type: string;
    description?: string;
    required?: boolean;
    defaultValue?: string;
    options?: unknown;
    validation?: unknown;
    order?: number;
  }>;
}

interface DeployTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  /**
   * Create a new template
   */
  @Post()
  async create(@Body() dto: CreateTemplateDto, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.templateService.create(dto.isPublic ? null : teamId, userId, {
      ...dto,
      graph: dto.graph as Prisma.InputJsonValue,
      settings: dto.settings as Prisma.InputJsonValue | undefined,
      parameters: dto.parameters?.map((p) => ({
        ...p,
        options: p.options as Prisma.InputJsonValue | undefined,
        validation: p.validation as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  /**
   * Get template gallery
   */
  @Get('gallery')
  async getGallery(
    @Req() req: any,
    @Query('category') category?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('tags') tagsStr?: string,
    @Query('difficulty') difficulty?: TemplateDifficulty,
    @Query('isFeatured') isFeatured?: string,
    @Query('isCommunity') isCommunity?: string,
    @Query('sortBy') sortBy?: 'popular' | 'rating' | 'newest',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.templateService.getGallery(teamId, {
      category,
      categoryId,
      search,
      tags: tagsStr ? tagsStr.split(',') : undefined,
      difficulty,
      isFeatured: isFeatured ? isFeatured === 'true' : undefined,
      isCommunity: isCommunity ? isCommunity === 'true' : undefined,
      sortBy,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * Get featured templates
   */
  @Get('featured')
  async getFeatured(@Req() req: any, @Query('limit') limit?: string) {
    const teamId = req.user.currentTeamId;
    return this.templateService.getFeatured(
      teamId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Get template categories
   */
  @Get('categories')
  async getCategories() {
    return this.templateService.getCategories();
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.templateService.findById(id, teamId);
  }

  /**
   * Update a template
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateTemplateDto>,
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.templateService.update(id, teamId, userId, {
      ...dto,
      graph: dto.graph as Prisma.InputJsonValue | undefined,
      settings: dto.settings as Prisma.InputJsonValue | undefined,
    });
  }

  /**
   * Deploy a template (create workflow from template)
   */
  @Post('deploy')
  async deploy(@Body() dto: DeployTemplateDto, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.templateService.deploy(teamId, userId, dto);
  }

  /**
   * Rate a template
   */
  @Post(':id/rate')
  async rate(
    @Param('id') id: string,
    @Body() dto: { rating: number; review?: string },
    @Req() req: any,
  ) {
    const userId = req.user.id;
    return this.templateService.rate(id, userId, dto.rating, dto.review);
  }

  /**
   * Create template from workflow
   */
  @Post('from-workflow/:workflowId')
  async createFromWorkflow(
    @Param('workflowId') workflowId: string,
    @Body()
    dto: {
      name: string;
      description?: string;
      category: string;
      isPublic?: boolean;
      parameters?: Array<{
        name: string;
        label: string;
        type: string;
        description?: string;
        required?: boolean;
        defaultValue?: string;
      }>;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    const userId = req.user.id;
    return this.templateService.createFromWorkflow(workflowId, teamId, userId, dto);
  }

  /**
   * Update template parameters
   */
  @Put(':id/parameters')
  async updateParameters(
    @Param('id') id: string,
    @Body()
    dto: {
      parameters: Array<{
        name: string;
        label: string;
        type: string;
        description?: string;
        required?: boolean;
        defaultValue?: string;
        options?: unknown;
        validation?: unknown;
        order?: number;
      }>;
    },
    @Req() req: any,
  ) {
    const teamId = req.user.currentTeamId;
    return this.templateService.updateParameters(id, teamId, dto.parameters.map((p) => ({
      ...p,
      options: p.options as Prisma.InputJsonValue | undefined,
      validation: p.validation as Prisma.InputJsonValue | undefined,
    })));
  }

  /**
   * Delete a template
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.templateService.delete(id, teamId);
  }
}
