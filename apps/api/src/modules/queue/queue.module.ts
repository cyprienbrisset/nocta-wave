import { Module, Global } from '@nestjs/common';
import { DistributedQueueService } from './distributed-queue.service';
import { WorkerPoolService } from './worker-pool.service';
import { QueueController } from './queue.controller';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [DistributedQueueService, WorkerPoolService],
  controllers: [QueueController],
  exports: [DistributedQueueService, WorkerPoolService],
})
export class QueueModule {}
