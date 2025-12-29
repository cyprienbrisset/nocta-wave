import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  InputSchemaItem,
  OutputSchemaItem,
  CreateSubWorkflowDto,
  UpdateSubWorkflowDto,
  toInputSchema,
  toOutputSchema,
} from '@ws-flows/shared';

// Maximum recursion depth for sub-workflow calls
const MAX_RECURSION_DEPTH = 10;

// Execution context for tracking recursion
export interface SubWorkflowExecutionContext {
  parentExecutionId: string;
  depth: number;
  callStack: string[]; // Track workflow IDs to detect cycles
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
}

@Injectable()
export class SubWorkflowService {
  private readonly logger = new Logger(SubWorkflowService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a sub-workflow from an existing workflow
   */
  async create(teamId: string, dto: CreateSubWorkflowDto) {
    // Verify the workflow exists and belongs to the team
    const workflow = await this.prisma.workflow.findFirst({
      where: {
        id: dto.workflowId,
        teamId,
      },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if sub-workflow already exists for this workflow
    const existing = await this.prisma.subWorkflow.findUnique({
      where: { workflowId: dto.workflowId },
    });

    if (existing) {
      throw new BadRequestException('Sub-workflow already exists for this workflow');
    }

    // Create the sub-workflow
    const subWorkflow = await this.prisma.subWorkflow.create({
      data: {
        workflowId: dto.workflowId,
        name: dto.name,
        description: dto.description,
        category: dto.category || 'custom',
        icon: dto.icon,
        inputSchema: dto.inputSchema as unknown as Prisma.InputJsonValue,
        outputSchema: dto.outputSchema as unknown as Prisma.InputJsonValue,
        isPublic: dto.isPublic || false,
        isShared: dto.isShared || false,
        publishedAt: new Date(),
      },
      include: {
        workflow: {
          select: {
            name: true,
            teamId: true,
          },
        },
      },
    });

    this.logger.log(`Created sub-workflow: ${subWorkflow.id} from workflow: ${dto.workflowId}`);

    return subWorkflow;
  }

  /**
   * Update a sub-workflow
   */
  async update(teamId: string, subWorkflowId: string, dto: UpdateSubWorkflowDto) {
    // Verify the sub-workflow exists and belongs to the team
    const subWorkflow = await this.prisma.subWorkflow.findFirst({
      where: {
        id: subWorkflowId,
        workflow: { teamId },
      },
    });

    if (!subWorkflow) {
      throw new NotFoundException('Sub-workflow not found');
    }

    const updated = await this.prisma.subWorkflow.update({
      where: { id: subWorkflowId },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        icon: dto.icon,
        inputSchema: dto.inputSchema as unknown as Prisma.InputJsonValue,
        outputSchema: dto.outputSchema as unknown as Prisma.InputJsonValue,
        isPublic: dto.isPublic,
        isShared: dto.isShared,
      },
      include: {
        workflow: {
          select: { name: true },
        },
      },
    });

    this.logger.log(`Updated sub-workflow: ${subWorkflowId}`);

    return updated;
  }

  /**
   * Publish a new version of a sub-workflow
   */
  async publishVersion(teamId: string, subWorkflowId: string) {
    const subWorkflow = await this.prisma.subWorkflow.findFirst({
      where: {
        id: subWorkflowId,
        workflow: { teamId },
      },
      include: {
        workflow: true,
      },
    });

    if (!subWorkflow) {
      throw new NotFoundException('Sub-workflow not found');
    }

    // Mark current as not latest
    await this.prisma.subWorkflow.update({
      where: { id: subWorkflowId },
      data: { isLatest: false },
    });

    // Create new version
    const newVersion = await this.prisma.subWorkflow.create({
      data: {
        workflowId: subWorkflow.workflowId,
        name: subWorkflow.name,
        description: subWorkflow.description,
        category: subWorkflow.category,
        icon: subWorkflow.icon,
        inputSchema: subWorkflow.inputSchema as Prisma.InputJsonValue,
        outputSchema: subWorkflow.outputSchema as Prisma.InputJsonValue,
        isPublic: subWorkflow.isPublic,
        isShared: subWorkflow.isShared,
        version: subWorkflow.version + 1,
        isLatest: true,
        previousVersion: subWorkflowId,
        publishedAt: new Date(),
      },
    });

    this.logger.log(`Published new version ${newVersion.version} for sub-workflow: ${subWorkflowId}`);

    return newVersion;
  }

  /**
   * Get a sub-workflow by ID
   */
  async findById(subWorkflowId: string, teamId?: string) {
    const where: Prisma.SubWorkflowWhereInput = {
      id: subWorkflowId,
    };

    // If teamId provided, also check team access
    if (teamId) {
      where.OR = [
        { workflow: { teamId } },
        { isPublic: true },
        { isShared: true, workflow: { teamId } },
      ];
    }

    const subWorkflow = await this.prisma.subWorkflow.findFirst({
      where,
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            teamId: true,
            graph: true,
          },
        },
        usages: {
          select: {
            parentWorkflowId: true,
            nodeId: true,
          },
        },
      },
    });

    if (!subWorkflow) {
      throw new NotFoundException('Sub-workflow not found');
    }

    return subWorkflow;
  }

  /**
   * Get sub-workflow by workflow ID
   */
  async findByWorkflowId(workflowId: string) {
    return this.prisma.subWorkflow.findUnique({
      where: { workflowId },
      include: {
        workflow: {
          select: { name: true, teamId: true },
        },
      },
    });
  }

  /**
   * Get the library of available sub-workflows
   */
  async getLibrary(
    teamId: string,
    options?: {
      category?: string;
      search?: string;
      includePublic?: boolean;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.SubWorkflowWhereInput = {
      isLatest: true,
      OR: [
        // Team's own sub-workflows
        { workflow: { teamId } },
      ],
    };

    // Include public sub-workflows
    if (options?.includePublic !== false) {
      (where.OR as Prisma.SubWorkflowWhereInput[]).push({ isPublic: true });
    }

    // Filter by category
    if (options?.category) {
      where.category = options.category;
    }

    // Search by name or description
    if (options?.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { description: { contains: options.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [subWorkflows, total] = await Promise.all([
      this.prisma.subWorkflow.findMany({
        where,
        include: {
          workflow: {
            select: {
              name: true,
              teamId: true,
              team: {
                select: { name: true },
              },
            },
          },
          _count: {
            select: { usages: true },
          },
        },
        orderBy: [{ usageCount: 'desc' }, { name: 'asc' }],
        skip: options?.skip || 0,
        take: options?.take || 50,
      }),
      this.prisma.subWorkflow.count({ where }),
    ]);

    return {
      data: subWorkflows,
      total,
      categories: await this.getCategories(teamId),
    };
  }

  /**
   * Get available categories
   */
  async getCategories(teamId: string) {
    const categories = await this.prisma.subWorkflow.groupBy({
      by: ['category'],
      where: {
        isLatest: true,
        OR: [{ workflow: { teamId } }, { isPublic: true }],
      },
      _count: { id: true },
    });

    return categories.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));
  }

  /**
   * Record usage of a sub-workflow in a parent workflow
   */
  async recordUsage(
    subWorkflowId: string,
    parentWorkflowId: string,
    nodeId: string,
    options?: {
      versionPinned?: boolean;
      pinnedVersion?: number;
    },
  ) {
    const usage = await this.prisma.subWorkflowUsage.upsert({
      where: {
        parentWorkflowId_nodeId: {
          parentWorkflowId,
          nodeId,
        },
      },
      create: {
        subWorkflowId,
        parentWorkflowId,
        nodeId,
        versionPinned: options?.versionPinned || false,
        pinnedVersion: options?.pinnedVersion,
      },
      update: {
        subWorkflowId,
        versionPinned: options?.versionPinned || false,
        pinnedVersion: options?.pinnedVersion,
      },
    });

    // Increment usage count
    await this.prisma.subWorkflow.update({
      where: { id: subWorkflowId },
      data: { usageCount: { increment: 1 } },
    });

    return usage;
  }

  /**
   * Remove usage record when sub-workflow node is deleted
   */
  async removeUsage(parentWorkflowId: string, nodeId: string) {
    const deleted = await this.prisma.subWorkflowUsage.delete({
      where: {
        parentWorkflowId_nodeId: {
          parentWorkflowId,
          nodeId,
        },
      },
    });

    // Decrement usage count
    if (deleted) {
      await this.prisma.subWorkflow.update({
        where: { id: deleted.subWorkflowId },
        data: { usageCount: { decrement: 1 } },
      });
    }

    return deleted;
  }

  /**
   * Get usages of a sub-workflow
   */
  async getUsages(subWorkflowId: string, teamId: string) {
    return this.prisma.subWorkflowUsage.findMany({
      where: {
        subWorkflowId,
        parentWorkflow: { teamId },
      },
      include: {
        parentWorkflow: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get version history of a sub-workflow
   */
  async getVersionHistory(workflowId: string) {
    return this.prisma.subWorkflow.findMany({
      where: { workflowId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        isLatest: true,
        publishedAt: true,
        inputSchema: true,
        outputSchema: true,
      },
    });
  }

  /**
   * Delete a sub-workflow
   */
  async delete(teamId: string, subWorkflowId: string) {
    const subWorkflow = await this.prisma.subWorkflow.findFirst({
      where: {
        id: subWorkflowId,
        workflow: { teamId },
      },
    });

    if (!subWorkflow) {
      throw new NotFoundException('Sub-workflow not found');
    }

    // Check for active usages
    const usageCount = await this.prisma.subWorkflowUsage.count({
      where: { subWorkflowId },
    });

    if (usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete sub-workflow: it is used in ${usageCount} workflow(s)`,
      );
    }

    await this.prisma.subWorkflow.delete({
      where: { id: subWorkflowId },
    });

    this.logger.log(`Deleted sub-workflow: ${subWorkflowId}`);

    return { success: true };
  }

  /**
   * Get sub-workflow for execution (resolves version)
   */
  async getForExecution(
    subWorkflowId: string,
    options?: {
      versionPinned?: boolean;
      pinnedVersion?: number;
    },
  ) {
    let subWorkflow;

    if (options?.versionPinned && options?.pinnedVersion) {
      // Get specific version
      subWorkflow = await this.prisma.subWorkflow.findFirst({
        where: {
          OR: [
            { id: subWorkflowId },
            { workflowId: subWorkflowId },
          ],
          version: options.pinnedVersion,
        },
        include: {
          workflow: {
            select: {
              id: true,
              graph: true,
              settings: true,
              teamId: true,
            },
          },
        },
      });
    } else {
      // Get latest version
      subWorkflow = await this.prisma.subWorkflow.findFirst({
        where: {
          OR: [
            { id: subWorkflowId },
            { workflowId: subWorkflowId },
          ],
          isLatest: true,
        },
        include: {
          workflow: {
            select: {
              id: true,
              graph: true,
              settings: true,
              teamId: true,
            },
          },
        },
      });
    }

    if (!subWorkflow) {
      throw new NotFoundException('Sub-workflow not found');
    }

    return subWorkflow;
  }

  /**
   * Validate input data against sub-workflow schema
   */
  validateInput(inputData: Record<string, unknown>, inputSchema: InputSchemaItem[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    for (const param of inputSchema) {
      const value = inputData[param.name];

      // Check required
      if (param.required && (value === undefined || value === null)) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      // Skip validation if value not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (param.type !== 'any' && actualType !== param.type) {
        if (!(param.type === 'object' && actualType === 'object')) {
          errors.push(
            `Parameter ${param.name}: expected ${param.type}, got ${actualType}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate execution context for recursion limits
   */
  validateExecutionContext(
    context: SubWorkflowExecutionContext,
    workflowId: string,
  ): { valid: boolean; error?: string } {
    // Check depth limit
    if (context.depth >= MAX_RECURSION_DEPTH) {
      return {
        valid: false,
        error: `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded. ` +
          `Current depth: ${context.depth}`,
      };
    }

    // Check for circular calls
    if (context.callStack.includes(workflowId)) {
      const cycleIndex = context.callStack.indexOf(workflowId);
      const cyclePath = [...context.callStack.slice(cycleIndex), workflowId].join(' -> ');
      return {
        valid: false,
        error: `Circular sub-workflow call detected: ${cyclePath}`,
      };
    }

    return { valid: true };
  }

  /**
   * Create execution context for a sub-workflow call
   */
  createExecutionContext(
    parentExecutionId: string,
    parentContext: SubWorkflowExecutionContext | null,
    workflowId: string,
    inputMapping: Record<string, string>,
    outputMapping: Record<string, string>,
  ): SubWorkflowExecutionContext {
    return {
      parentExecutionId,
      depth: parentContext ? parentContext.depth + 1 : 0,
      callStack: parentContext
        ? [...parentContext.callStack, workflowId]
        : [workflowId],
      inputMapping,
      outputMapping,
    };
  }

  /**
   * Check for circular dependencies before adding a sub-workflow
   */
  async checkCircularDependency(
    parentWorkflowId: string,
    childWorkflowId: string,
    visited: Set<string> = new Set(),
  ): Promise<{ hasCircle: boolean; path?: string[] }> {
    if (parentWorkflowId === childWorkflowId) {
      return { hasCircle: true, path: [parentWorkflowId, childWorkflowId] };
    }

    if (visited.has(childWorkflowId)) {
      return { hasCircle: false };
    }
    visited.add(childWorkflowId);

    // Get all sub-workflows used by the child
    const childUsages = await this.prisma.subWorkflowUsage.findMany({
      where: { parentWorkflowId: childWorkflowId },
      include: {
        subWorkflow: true,
      },
    });

    for (const usage of childUsages) {
      const nestedWorkflowId = usage.subWorkflow.workflowId;

      if (nestedWorkflowId === parentWorkflowId) {
        return {
          hasCircle: true,
          path: [parentWorkflowId, childWorkflowId, nestedWorkflowId],
        };
      }

      const result = await this.checkCircularDependency(
        parentWorkflowId,
        nestedWorkflowId,
        visited,
      );

      if (result.hasCircle) {
        return {
          hasCircle: true,
          path: [parentWorkflowId, childWorkflowId, ...(result.path || [])],
        };
      }
    }

    return { hasCircle: false };
  }

  /**
   * Get the full dependency tree for visualization
   */
  async getDependencyTree(
    workflowId: string,
    depth: number = 0,
    maxDepth: number = 5,
    visited: Set<string> = new Set(),
  ): Promise<{
    workflowId: string;
    name: string;
    depth: number;
    children: any[];
    hasCircularRef: boolean;
  }> {
    // Prevent infinite loops
    if (visited.has(workflowId)) {
      return {
        workflowId,
        name: '(circular reference)',
        depth,
        children: [],
        hasCircularRef: true,
      };
    }

    if (depth >= maxDepth) {
      return {
        workflowId,
        name: '(max depth reached)',
        depth,
        children: [],
        hasCircularRef: false,
      };
    }

    visited.add(workflowId);

    // Get workflow info
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      select: { id: true, name: true },
    });

    if (!workflow) {
      return {
        workflowId,
        name: '(not found)',
        depth,
        children: [],
        hasCircularRef: false,
      };
    }

    // Get sub-workflow usages
    const usages = await this.prisma.subWorkflowUsage.findMany({
      where: { parentWorkflowId: workflowId },
      include: {
        subWorkflow: {
          include: {
            workflow: { select: { id: true, name: true } },
          },
        },
      },
    });

    const children = await Promise.all(
      usages.map(async (usage) => {
        return this.getDependencyTree(
          usage.subWorkflow.workflowId,
          depth + 1,
          maxDepth,
          new Set(visited),
        );
      }),
    );

    return {
      workflowId: workflow.id,
      name: workflow.name,
      depth,
      children,
      hasCircularRef: false,
    };
  }

  /**
   * Map input data from parent to sub-workflow using expressions
   */
  mapInputData(
    inputMapping: Record<string, string>,
    parentData: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [targetKey, expression] of Object.entries(inputMapping)) {
      result[targetKey] = this.evaluateExpression(expression, parentData);
    }

    return result;
  }

  /**
   * Map output data from sub-workflow to parent using expressions
   */
  mapOutputData(
    outputMapping: Record<string, string>,
    subWorkflowOutput: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [targetKey, expression] of Object.entries(outputMapping)) {
      result[targetKey] = this.evaluateExpression(expression, subWorkflowOutput);
    }

    return result;
  }

  /**
   * Evaluate a simple expression against data
   * Supports: $.path.to.value, {{variable}}, and literal values
   */
  private evaluateExpression(expression: string, data: Record<string, any>): any {
    // JSONPath-like expression
    if (expression.startsWith('$.')) {
      const path = expression.slice(2).split('.');
      let value: any = data;
      for (const key of path) {
        if (value === undefined || value === null) return undefined;
        // Handle array indices
        if (/^\d+$/.test(key)) {
          value = value[parseInt(key, 10)];
        } else {
          value = value[key];
        }
      }
      return value;
    }

    // Template expression {{variable}}
    if (expression.startsWith('{{') && expression.endsWith('}}')) {
      const varName = expression.slice(2, -2).trim();
      return data[varName];
    }

    // JSON value
    try {
      return JSON.parse(expression);
    } catch {
      // Return as literal string
      return expression;
    }
  }

  /**
   * Get max recursion depth setting
   */
  getMaxRecursionDepth(): number {
    return MAX_RECURSION_DEPTH;
  }
}
