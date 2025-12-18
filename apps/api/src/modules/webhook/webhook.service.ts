import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TeamService } from '../team/team.service';
import { ExecutionService } from '../execution/execution.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import * as crypto from 'crypto';

@Injectable()
export class WebhookService {
  constructor(
    private prisma: PrismaService,
    private teamService: TeamService,
    private executionService: ExecutionService,
  ) {}

  async create(workflowId: string, userId: string, dto: CreateWebhookDto) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    // Generate unique path
    const path = dto.path || this.generatePath();

    // Check for duplicate path
    const existing = await this.prisma.webhook.findUnique({
      where: { path },
    });

    if (existing) {
      throw new BadRequestException('Webhook path already exists');
    }

    return this.prisma.webhook.create({
      data: {
        workflowId,
        path,
        method: dto.method || 'POST',
        secret: dto.secret || this.generateSecret(),
      },
    });
  }

  async findByPath(path: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { path },
      include: {
        workflow: true,
      },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return webhook;
  }

  async findByWorkflow(workflowId: string, userId: string) {
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    await this.teamService.checkTeamAccess(workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
      'VIEWER',
    ]);

    return this.prisma.webhook.findMany({
      where: { workflowId },
    });
  }

  async update(id: string, userId: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.teamService.checkTeamAccess(webhook.workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
      'MEMBER',
    ]);

    return this.prisma.webhook.update({
      where: { id },
      data: {
        method: dto.method,
        isActive: dto.isActive,
      },
    });
  }

  async delete(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.teamService.checkTeamAccess(webhook.workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    await this.prisma.webhook.delete({
      where: { id },
    });

    return { message: 'Webhook deleted successfully' };
  }

  async regenerateSecret(id: string, userId: string) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id },
      include: { workflow: true },
    });

    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    await this.teamService.checkTeamAccess(webhook.workflow.teamId, userId, [
      'OWNER',
      'ADMIN',
    ]);

    return this.prisma.webhook.update({
      where: { id },
      data: {
        secret: this.generateSecret(),
      },
    });
  }

  /**
   * Handle incoming webhook request
   */
  async handleWebhook(
    path: string,
    method: string,
    body: any,
    headers: Record<string, string>,
    query: Record<string, string>,
  ) {
    const webhook = await this.findByPath(path);

    if (!webhook.isActive) {
      throw new BadRequestException('Webhook is disabled');
    }

    if (webhook.method !== method && webhook.method !== 'ANY') {
      throw new BadRequestException(`Method ${method} not allowed`);
    }

    if (!webhook.workflow.isActive) {
      throw new BadRequestException('Workflow is not active');
    }

    // Verify signature if secret is set
    if (webhook.secret && headers['x-webhook-signature']) {
      const isValid = this.verifySignature(
        body,
        headers['x-webhook-signature'],
        webhook.secret,
      );

      if (!isValid) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Trigger workflow execution
    const execution = await this.executionService.trigger(
      webhook.workflowId,
      undefined as any, // No user for webhook triggers
      'WEBHOOK',
      {
        body,
        headers,
        query,
        method,
        path,
      },
    );

    return {
      executionId: execution.id,
      status: execution.status,
    };
  }

  private generatePath(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private verifySignature(
    body: any,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  }
}
