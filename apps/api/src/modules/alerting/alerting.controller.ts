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
import { AlertingService } from './alerting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertCondition, AlertChannelType } from '@prisma/client';

interface CreateAlertRuleDto {
  name: string;
  description?: string;
  condition: AlertCondition;
  threshold?: number;
  workflowId?: string;
  cooldownMs?: number;
  channels: Array<{
    type: AlertChannelType;
    config: Record<string, any>;
  }>;
}

interface UpdateAlertRuleDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  condition?: AlertCondition;
  threshold?: number;
  cooldownMs?: number;
}

@Controller('alerting')
@UseGuards(JwtAuthGuard)
export class AlertingController {
  constructor(private alertingService: AlertingService) {}

  @Post('rules')
  async createAlertRule(@Body() dto: CreateAlertRuleDto, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.alertingService.createAlertRule(teamId, dto);
  }

  @Get('rules')
  async getAlertRules(@Req() req: any) {
    const teamId = req.user.currentTeamId;
    return this.alertingService.getAlertRules(teamId);
  }

  @Get('rules/:id')
  async getAlertRule(@Param('id') id: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    const rules = await this.alertingService.getAlertRules(teamId);
    return rules.find((r) => r.id === id);
  }

  @Get('history')
  async getAlertHistory(
    @Req() req: any,
    @Query('alertRuleId') alertRuleId?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const teamId = req.user.currentTeamId;
    return this.alertingService.getAlertHistory(teamId, {
      alertRuleId,
      acknowledged: acknowledged ? acknowledged === 'true' : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Put('history/:id/acknowledge')
  async acknowledgeAlert(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    return this.alertingService.acknowledgeAlert(id, userId);
  }

  @Post('test/:ruleId')
  async testAlertRule(@Param('ruleId') ruleId: string, @Req() req: any) {
    const teamId = req.user.currentTeamId;
    const rules = await this.alertingService.getAlertRules(teamId);
    const rule = rules.find((r) => r.id === ruleId);

    if (!rule) {
      throw new Error('Alert rule not found');
    }

    // Send test alert to all channels
    const testContext = {
      teamId,
      workflowId: 'test-workflow',
      workflowName: 'Test Workflow',
      executionId: 'test-execution',
      errorMessage: 'This is a test alert',
    };

    // Use private method through reflection for testing
    await (this.alertingService as any).fireAlert(rule, testContext, 'INFO');

    return { success: true, message: 'Test alert sent' };
  }
}
