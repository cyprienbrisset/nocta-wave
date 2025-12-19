import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EncryptionService } from '../credential/encryption.service';
import type { VariableType, PromotionStatus } from '@prisma/client';

interface CreateEnvironmentDto {
  name: string;
  slug: string;
  description?: string;
  color?: string;
  order?: number;
  isDefault?: boolean;
  isProduction?: boolean;
}

interface UpdateEnvironmentDto {
  name?: string;
  description?: string;
  color?: string;
  order?: number;
  isDefault?: boolean;
  isProduction?: boolean;
}

interface CreateVariableDto {
  key: string;
  description?: string;
  type?: VariableType;
  isSecret?: boolean;
  isGlobal?: boolean;
  values?: Array<{
    environmentId: string;
    value: string;
  }>;
}

interface UpdateVariableDto {
  description?: string;
  type?: VariableType;
  isGlobal?: boolean;
}

interface SetVariableValueDto {
  variableId: string;
  environmentId: string;
  value: string;
}

interface PromoteVariablesDto {
  sourceEnvId: string;
  targetEnvId: string;
  variableIds?: string[]; // If not provided, promote all
  changelog?: string;
}

@Injectable()
export class EnvironmentService {
  private readonly logger = new Logger(EnvironmentService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  // ============================================================================
  // ENVIRONMENTS
  // ============================================================================

  /**
   * Create default environments for a team
   */
  async createDefaultEnvironments(teamId: string) {
    const defaults = [
      { name: 'Development', slug: 'dev', color: '#22c55e', order: 0, isDefault: true },
      { name: 'Staging', slug: 'staging', color: '#f59e0b', order: 1 },
      { name: 'Production', slug: 'prod', color: '#ef4444', order: 2, isProduction: true },
    ];

    const environments = await this.prisma.environment.createMany({
      data: defaults.map((env) => ({
        teamId,
        ...env,
      })),
    });

    this.logger.log(`Created ${environments.count} default environments for team ${teamId}`);
    return this.getEnvironments(teamId);
  }

  /**
   * Get all environments for a team
   */
  async getEnvironments(teamId: string) {
    return this.prisma.environment.findMany({
      where: { teamId },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { variables: true } },
      },
    });
  }

  /**
   * Create a new environment
   */
  async createEnvironment(teamId: string, dto: CreateEnvironmentDto) {
    // Check if slug is unique
    const existing = await this.prisma.environment.findUnique({
      where: { teamId_slug: { teamId, slug: dto.slug } },
    });

    if (existing) {
      throw new ConflictException(`Environment with slug '${dto.slug}' already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.environment.updateMany({
        where: { teamId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const environment = await this.prisma.environment.create({
      data: {
        teamId,
        ...dto,
      },
    });

    this.logger.log(`Created environment ${environment.id}: ${environment.name}`);
    return environment;
  }

  /**
   * Update an environment
   */
  async updateEnvironment(id: string, teamId: string, dto: UpdateEnvironmentDto) {
    const environment = await this.prisma.environment.findFirst({
      where: { id, teamId },
    });

    if (!environment) {
      throw new NotFoundException(`Environment not found: ${id}`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.environment.updateMany({
        where: { teamId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.environment.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Delete an environment
   */
  async deleteEnvironment(id: string, teamId: string) {
    const environment = await this.prisma.environment.findFirst({
      where: { id, teamId },
    });

    if (!environment) {
      throw new NotFoundException(`Environment not found: ${id}`);
    }

    if (environment.isProduction) {
      throw new BadRequestException('Cannot delete production environment');
    }

    await this.prisma.environment.delete({ where: { id } });
    this.logger.log(`Deleted environment ${id}`);
    return { success: true };
  }

  // ============================================================================
  // VARIABLES
  // ============================================================================

  /**
   * Get all variables for a team
   */
  async getVariables(teamId: string, environmentId?: string) {
    const variables = await this.prisma.variable.findMany({
      where: { teamId },
      orderBy: { key: 'asc' },
      include: {
        values: {
          where: environmentId ? { environmentId } : undefined,
          include: {
            environment: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    // Decrypt secret values for display (masked)
    return variables.map((v) => ({
      ...v,
      values: v.values.map((val) => ({
        ...val,
        value: v.isSecret ? this.maskSecret(val.value) : val.value,
        _encrypted: v.isSecret,
      })),
    }));
  }

  /**
   * Get variables for a specific environment (for execution)
   */
  async getVariablesForExecution(teamId: string, environmentId: string) {
    const variables = await this.prisma.variable.findMany({
      where: {
        teamId,
        OR: [{ isGlobal: true }, { values: { some: { environmentId } } }],
      },
      include: {
        values: {
          where: { environmentId },
        },
      },
    });

    const result: Record<string, unknown> = {};

    for (const variable of variables) {
      const envValue = variable.values[0];
      if (envValue) {
        let value: unknown = envValue.value;

        // Decrypt if secret
        if (variable.isSecret) {
          value = this.encryption.decrypt(envValue.value);
        }

        // Parse based on type
        result[variable.key] = this.parseVariableValue(value as string, variable.type);
      }
    }

    return result;
  }

  /**
   * Create a new variable
   */
  async createVariable(teamId: string, dto: CreateVariableDto) {
    // Check if key is unique
    const existing = await this.prisma.variable.findUnique({
      where: { teamId_key: { teamId, key: dto.key } },
    });

    if (existing) {
      throw new ConflictException(`Variable '${dto.key}' already exists`);
    }

    // Validate key format
    if (!/^[A-Z][A-Z0-9_]*$/.test(dto.key)) {
      throw new BadRequestException(
        'Variable key must be uppercase letters, numbers, and underscores, starting with a letter',
      );
    }

    const variable = await this.prisma.variable.create({
      data: {
        teamId,
        key: dto.key,
        description: dto.description,
        type: dto.type || 'STRING',
        isSecret: dto.isSecret || false,
        isGlobal: dto.isGlobal ?? true,
      },
    });

    // Set values if provided
    if (dto.values && dto.values.length > 0) {
      for (const val of dto.values) {
        await this.setVariableValue(teamId, {
          variableId: variable.id,
          environmentId: val.environmentId,
          value: val.value,
        });
      }
    }

    this.logger.log(`Created variable ${variable.id}: ${variable.key}`);
    return this.getVariableById(variable.id, teamId);
  }

  /**
   * Get variable by ID
   */
  async getVariableById(id: string, teamId: string) {
    const variable = await this.prisma.variable.findFirst({
      where: { id, teamId },
      include: {
        values: {
          include: {
            environment: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    if (!variable) {
      throw new NotFoundException(`Variable not found: ${id}`);
    }

    return {
      ...variable,
      values: variable.values.map((val) => ({
        ...val,
        value: variable.isSecret ? this.maskSecret(val.value) : val.value,
        _encrypted: variable.isSecret,
      })),
    };
  }

  /**
   * Update a variable
   */
  async updateVariable(id: string, teamId: string, dto: UpdateVariableDto) {
    const variable = await this.prisma.variable.findFirst({
      where: { id, teamId },
    });

    if (!variable) {
      throw new NotFoundException(`Variable not found: ${id}`);
    }

    return this.prisma.variable.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Set variable value for an environment
   */
  async setVariableValue(teamId: string, dto: SetVariableValueDto) {
    const variable = await this.prisma.variable.findFirst({
      where: { id: dto.variableId, teamId },
    });

    if (!variable) {
      throw new NotFoundException(`Variable not found: ${dto.variableId}`);
    }

    // Encrypt if secret
    let value = dto.value;
    let encryptedAt: Date | null = null;

    if (variable.isSecret) {
      value = this.encryption.encrypt(dto.value);
      encryptedAt = new Date();
    }

    await this.prisma.environmentVariable.upsert({
      where: {
        variableId_environmentId: {
          variableId: dto.variableId,
          environmentId: dto.environmentId,
        },
      },
      create: {
        variableId: dto.variableId,
        environmentId: dto.environmentId,
        value,
        encryptedAt,
      },
      update: {
        value,
        encryptedAt,
      },
    });

    this.logger.log(`Set variable ${variable.key} for environment ${dto.environmentId}`);
    return { success: true };
  }

  /**
   * Delete a variable
   */
  async deleteVariable(id: string, teamId: string) {
    const variable = await this.prisma.variable.findFirst({
      where: { id, teamId },
    });

    if (!variable) {
      throw new NotFoundException(`Variable not found: ${id}`);
    }

    await this.prisma.variable.delete({ where: { id } });
    this.logger.log(`Deleted variable ${id}: ${variable.key}`);
    return { success: true };
  }

  // ============================================================================
  // ENVIRONMENT PROMOTION
  // ============================================================================

  /**
   * Promote variables from one environment to another
   */
  async promoteVariables(teamId: string, userId: string, dto: PromoteVariablesDto) {
    const [sourceEnv, targetEnv] = await Promise.all([
      this.prisma.environment.findFirst({ where: { id: dto.sourceEnvId, teamId } }),
      this.prisma.environment.findFirst({ where: { id: dto.targetEnvId, teamId } }),
    ]);

    if (!sourceEnv || !targetEnv) {
      throw new NotFoundException('Source or target environment not found');
    }

    // Get source variables
    const sourceVariables = await this.prisma.environmentVariable.findMany({
      where: {
        environmentId: dto.sourceEnvId,
        ...(dto.variableIds && { variableId: { in: dto.variableIds } }),
      },
      include: {
        variable: true,
      },
    });

    // Create promotion record
    const promotion = await this.prisma.environmentPromotion.create({
      data: {
        teamId,
        sourceEnvId: dto.sourceEnvId,
        targetEnvId: dto.targetEnvId,
        promotedBy: userId,
        changelog: dto.changelog,
        variables: sourceVariables.map((v) => ({
          variableId: v.variableId,
          key: v.variable.key,
          value: v.variable.isSecret ? '[ENCRYPTED]' : v.value,
        })),
        status: targetEnv.isProduction ? 'PENDING' : 'APPROVED',
      },
    });

    // If target is not production, apply immediately
    if (!targetEnv.isProduction) {
      await this.applyPromotion(promotion.id, teamId, userId);
    }

    this.logger.log(
      `Created promotion ${promotion.id} from ${sourceEnv.slug} to ${targetEnv.slug}`,
    );

    return promotion;
  }

  /**
   * Approve a pending promotion
   */
  async approvePromotion(promotionId: string, teamId: string, userId: string) {
    const promotion = await this.prisma.environmentPromotion.findFirst({
      where: { id: promotionId, teamId, status: 'PENDING' },
    });

    if (!promotion) {
      throw new NotFoundException('Pending promotion not found');
    }

    await this.prisma.environmentPromotion.update({
      where: { id: promotionId },
      data: {
        status: 'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    return this.applyPromotion(promotionId, teamId, userId);
  }

  /**
   * Apply an approved promotion
   */
  private async applyPromotion(promotionId: string, teamId: string, userId: string) {
    const promotion = await this.prisma.environmentPromotion.findFirst({
      where: { id: promotionId, teamId, status: 'APPROVED' },
      include: { sourceEnv: true },
    });

    if (!promotion) {
      throw new NotFoundException('Approved promotion not found');
    }

    // Get source variables with actual values
    const variables = promotion.variables as Array<{ variableId: string }>;
    const sourceValues = await this.prisma.environmentVariable.findMany({
      where: {
        environmentId: promotion.sourceEnvId,
        variableId: { in: variables.map((v) => v.variableId) },
      },
    });

    // Copy values to target environment
    for (const sourceValue of sourceValues) {
      await this.prisma.environmentVariable.upsert({
        where: {
          variableId_environmentId: {
            variableId: sourceValue.variableId,
            environmentId: promotion.targetEnvId,
          },
        },
        create: {
          variableId: sourceValue.variableId,
          environmentId: promotion.targetEnvId,
          value: sourceValue.value,
          encryptedAt: sourceValue.encryptedAt,
        },
        update: {
          value: sourceValue.value,
          encryptedAt: sourceValue.encryptedAt,
        },
      });
    }

    await this.prisma.environmentPromotion.update({
      where: { id: promotionId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    this.logger.log(`Applied promotion ${promotionId}`);
    return { success: true, promotionId };
  }

  /**
   * Reject a pending promotion
   */
  async rejectPromotion(promotionId: string, teamId: string) {
    const promotion = await this.prisma.environmentPromotion.findFirst({
      where: { id: promotionId, teamId, status: 'PENDING' },
    });

    if (!promotion) {
      throw new NotFoundException('Pending promotion not found');
    }

    await this.prisma.environmentPromotion.update({
      where: { id: promotionId },
      data: { status: 'REJECTED' },
    });

    return { success: true };
  }

  /**
   * Get promotion history
   */
  async getPromotionHistory(teamId: string, limit = 20) {
    return this.prisma.environmentPromotion.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sourceEnv: { select: { id: true, name: true, slug: true } },
        targetEnv: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private maskSecret(value: string): string {
    if (value.length <= 8) {
      return '********';
    }
    return value.substring(0, 4) + '****' + value.substring(value.length - 4);
  }

  private parseVariableValue(value: string, type: VariableType): unknown {
    switch (type) {
      case 'NUMBER':
        return Number(value);
      case 'BOOLEAN':
        return value === 'true';
      case 'JSON':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}
