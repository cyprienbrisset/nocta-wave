import { Module, forwardRef } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { TeamModule } from '../team/team.module';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [TeamModule, forwardRef(() => BranchModule)],
  controllers: [WorkflowController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
