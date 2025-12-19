import { Module } from '@nestjs/common';
import { SubWorkflowService } from './subworkflow.service';
import { SubWorkflowController } from './subworkflow.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SubWorkflowService],
  controllers: [SubWorkflowController],
  exports: [SubWorkflowService],
})
export class SubWorkflowModule {}
