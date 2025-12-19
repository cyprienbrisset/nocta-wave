import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { Prisma, TemplateDifficulty } from '@prisma/client';

interface CreateTemplateDto {
  name: string;
  description?: string;
  longDescription?: string;
  category: string;
  categoryId?: string;
  icon?: string;
  thumbnail?: string;
  graph: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  estimatedTime?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
  parameters?: CreateTemplateParameterDto[];
}

interface CreateTemplateParameterDto {
  name: string;
  label: string;
  type: string;
  description?: string;
  required?: boolean;
  defaultValue?: string;
  options?: Prisma.InputJsonValue;
  validation?: Prisma.InputJsonValue;
  order?: number;
}

interface UpdateTemplateDto {
  name?: string;
  description?: string;
  longDescription?: string;
  category?: string;
  categoryId?: string;
  icon?: string;
  thumbnail?: string;
  graph?: Prisma.InputJsonValue;
  settings?: Prisma.InputJsonValue;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  estimatedTime?: number;
  isPublic?: boolean;
  isFeatured?: boolean;
}

interface TemplateGalleryQuery {
  category?: string;
  categoryId?: string;
  search?: string;
  tags?: string[];
  difficulty?: TemplateDifficulty;
  isFeatured?: boolean;
  isCommunity?: boolean;
  sortBy?: 'popular' | 'rating' | 'newest';
  skip?: number;
  take?: number;
}

interface DeployTemplateDto {
  templateId: string;
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new template
   */
  async create(teamId: string | null, userId: string, dto: CreateTemplateDto) {
    const { parameters, ...templateData } = dto;

    const template = await this.prisma.workflowTemplate.create({
      data: {
        ...templateData,
        teamId,
        createdById: userId,
        publishedAt: dto.isPublic ? new Date() : null,
        parameters: parameters
          ? {
              create: parameters.map((p, index) => ({
                ...p,
                order: p.order ?? index,
              })),
            }
          : undefined,
      },
      include: {
        parameters: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, avatar: true } },
        templateCategory: true,
      },
    });

    this.logger.log(`Created template ${template.id}: ${template.name}`);
    return template;
  }

  /**
   * Get template gallery with filtering
   */
  async getGallery(teamId: string, query: TemplateGalleryQuery) {
    const {
      category,
      categoryId,
      search,
      tags,
      difficulty,
      isFeatured,
      isCommunity,
      sortBy = 'popular',
      skip = 0,
      take = 20,
    } = query;

    const where: Prisma.WorkflowTemplateWhereInput = {
      OR: [
        { isPublic: true },
        { teamId },
      ],
      ...(category && { category }),
      ...(categoryId && { categoryId }),
      ...(difficulty && { difficulty }),
      ...(isFeatured !== undefined && { isFeatured }),
      ...(isCommunity !== undefined && { isCommunity }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { tags: { hasSome: [search.toLowerCase()] } },
        ],
      }),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
    };

    const orderBy: Prisma.WorkflowTemplateOrderByWithRelationInput =
      sortBy === 'popular'
        ? { usageCount: 'desc' }
        : sortBy === 'rating'
          ? { avgRating: 'desc' }
          : { createdAt: 'desc' };

    const [templates, total] = await Promise.all([
      this.prisma.workflowTemplate.findMany({
        where,
        orderBy,
        skip,
        take,
        include: {
          parameters: { orderBy: { order: 'asc' } },
          createdBy: { select: { id: true, name: true, avatar: true } },
          templateCategory: true,
          _count: { select: { ratings: true } },
        },
      }),
      this.prisma.workflowTemplate.count({ where }),
    ]);

    return {
      templates,
      total,
      hasMore: skip + take < total,
    };
  }

  /**
   * Get featured templates
   */
  async getFeatured(teamId: string, limit = 6) {
    return this.prisma.workflowTemplate.findMany({
      where: {
        isFeatured: true,
        OR: [{ isPublic: true }, { teamId }],
      },
      orderBy: { usageCount: 'desc' },
      take: limit,
      include: {
        templateCategory: true,
        createdBy: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * Get template categories
   */
  async getCategories() {
    const categories = await this.prisma.templateCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { templates: true } },
      },
    });

    // Also get unique category strings from templates for backwards compatibility
    const legacyCategories = await this.prisma.workflowTemplate.findMany({
      where: { isPublic: true },
      select: { category: true },
      distinct: ['category'],
    });

    return {
      categories,
      legacyCategories: legacyCategories.map((c) => c.category),
    };
  }

  /**
   * Get template by ID
   */
  async findById(id: string, teamId: string) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id,
        OR: [{ isPublic: true }, { teamId }],
      },
      include: {
        parameters: { orderBy: { order: 'asc' } },
        createdBy: { select: { id: true, name: true, avatar: true } },
        templateCategory: true,
        ratings: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return template;
  }

  /**
   * Update a template
   */
  async update(id: string, teamId: string, userId: string, dto: UpdateTemplateDto) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    return this.prisma.workflowTemplate.update({
      where: { id },
      data: {
        ...dto,
        publishedAt: dto.isPublic && !template.publishedAt ? new Date() : template.publishedAt,
      },
      include: {
        parameters: { orderBy: { order: 'asc' } },
        templateCategory: true,
      },
    });
  }

  /**
   * Deploy a template - create a new workflow from template
   */
  async deploy(teamId: string, userId: string, dto: DeployTemplateDto) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: {
        id: dto.templateId,
        OR: [{ isPublic: true }, { teamId }],
      },
      include: {
        parameters: true,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${dto.templateId}`);
    }

    // Validate required parameters
    const missingParams: string[] = [];
    for (const param of template.parameters) {
      if (param.required && dto.parameters[param.name] === undefined) {
        missingParams.push(param.label);
      }
    }

    if (missingParams.length > 0) {
      throw new BadRequestException(
        `Missing required parameters: ${missingParams.join(', ')}`,
      );
    }

    // Apply parameters to graph
    const graph = this.applyParametersToGraph(
      template.graph as Record<string, unknown>,
      dto.parameters,
      template.parameters,
    );

    // Create workflow from template
    const workflow = await this.prisma.workflow.create({
      data: {
        name: dto.name,
        description: dto.description || template.description,
        teamId,
        createdById: userId,
        graph: graph as Prisma.InputJsonValue,
        settings: template.settings as Prisma.InputJsonValue | undefined,
        status: 'DRAFT',
      },
    });

    // Increment usage count
    await this.prisma.workflowTemplate.update({
      where: { id: dto.templateId },
      data: { usageCount: { increment: 1 } },
    });

    this.logger.log(
      `Deployed template ${dto.templateId} as workflow ${workflow.id}`,
    );

    return workflow;
  }

  /**
   * Apply parameters to template graph
   */
  private applyParametersToGraph(
    graph: Record<string, unknown>,
    parameterValues: Record<string, unknown>,
    parameterDefs: Array<{ name: string; type: string; defaultValue?: string | null }>,
  ): Record<string, unknown> {
    // Deep clone the graph
    const newGraph = JSON.parse(JSON.stringify(graph));

    // Build parameter map with defaults
    const params: Record<string, unknown> = {};
    for (const def of parameterDefs) {
      params[def.name] =
        parameterValues[def.name] ??
        (def.defaultValue ? this.parseDefaultValue(def.defaultValue, def.type) : undefined);
    }

    // Replace {{param.name}} placeholders in the graph
    const replaceParams = (obj: unknown): unknown => {
      if (typeof obj === 'string') {
        return obj.replace(/\{\{param\.(\w+)\}\}/g, (_, paramName) => {
          const value = params[paramName];
          return value !== undefined ? String(value) : `{{param.${paramName}}}`;
        });
      }
      if (Array.isArray(obj)) {
        return obj.map(replaceParams);
      }
      if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceParams(value);
        }
        return result;
      }
      return obj;
    };

    return replaceParams(newGraph) as Record<string, unknown>;
  }

  private parseDefaultValue(value: string, type: string): unknown {
    switch (type) {
      case 'number':
        return Number(value);
      case 'boolean':
        return value === 'true';
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * Rate a template
   */
  async rate(templateId: string, userId: string, rating: number, review?: string) {
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const template = await this.prisma.workflowTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    // Upsert rating
    await this.prisma.templateRating.upsert({
      where: {
        templateId_userId: { templateId, userId },
      },
      create: {
        templateId,
        userId,
        rating,
        review,
      },
      update: {
        rating,
        review,
      },
    });

    // Recalculate average
    const stats = await this.prisma.templateRating.aggregate({
      where: { templateId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.workflowTemplate.update({
      where: { id: templateId },
      data: {
        avgRating: stats._avg.rating || 0,
        ratingCount: stats._count.rating,
      },
    });

    return { success: true };
  }

  /**
   * Create template from existing workflow
   */
  async createFromWorkflow(
    workflowId: string,
    teamId: string,
    userId: string,
    dto: {
      name: string;
      description?: string;
      category: string;
      isPublic?: boolean;
      parameters?: CreateTemplateParameterDto[];
    },
  ) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, teamId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow not found: ${workflowId}`);
    }

    return this.create(dto.isPublic ? null : teamId, userId, {
      name: dto.name,
      description: dto.description || workflow.description || undefined,
      category: dto.category,
      graph: workflow.graph as Prisma.InputJsonValue,
      settings: workflow.settings as Prisma.InputJsonValue | undefined,
      isPublic: dto.isPublic,
      parameters: dto.parameters,
    });
  }

  /**
   * Delete a template
   */
  async delete(id: string, teamId: string) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${id}`);
    }

    await this.prisma.workflowTemplate.delete({ where: { id } });

    this.logger.log(`Deleted template ${id}`);
    return { success: true };
  }

  /**
   * Update template parameters
   */
  async updateParameters(
    templateId: string,
    teamId: string,
    parameters: CreateTemplateParameterDto[],
  ) {
    const template = await this.prisma.workflowTemplate.findFirst({
      where: { id: templateId, teamId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found: ${templateId}`);
    }

    // Delete existing and create new
    await this.prisma.templateParameter.deleteMany({
      where: { templateId },
    });

    await this.prisma.templateParameter.createMany({
      data: parameters.map((p, index) => ({
        templateId,
        ...p,
        order: p.order ?? index,
      })),
    });

    return this.findById(templateId, teamId);
  }
}
