import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WorkflowModule } from '../workflow/workflow.module';
import { ExecutionModule } from '../execution/execution.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [WorkflowModule, ExecutionModule, TeamModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
