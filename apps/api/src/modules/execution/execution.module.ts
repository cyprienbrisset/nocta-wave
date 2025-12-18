import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { ExecutionGateway } from './execution.gateway';
import { WorkflowModule } from '../workflow/workflow.module';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [WorkflowModule, TeamModule],
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionGateway],
  exports: [ExecutionService],
})
export class ExecutionModule {}
