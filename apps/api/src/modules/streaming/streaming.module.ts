import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { StreamingService } from './streaming.service';
import { StreamingController } from './streaming.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule, EventEmitterModule.forRoot()],
  providers: [StreamingService],
  controllers: [StreamingController],
  exports: [StreamingService],
})
export class StreamingModule {}
