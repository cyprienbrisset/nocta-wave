import { Module } from '@nestjs/common';
import { WorkflowWorkerService } from './workflow-worker.service';
import { DatabaseModule } from '../database/database.module';
import { EncryptionService } from '../modules/credential/encryption.service';

@Module({
  imports: [DatabaseModule],
  providers: [WorkflowWorkerService, EncryptionService],
  exports: [WorkflowWorkerService],
})
export class WorkerModule {}
