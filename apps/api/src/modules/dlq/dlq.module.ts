import { Module } from '@nestjs/common';
import { DeadLetterQueueService } from './dlq.service';
import { DLQController } from './dlq.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [DeadLetterQueueService],
  controllers: [DLQController],
  exports: [DeadLetterQueueService],
})
export class DLQModule {}
