import { Module } from '@nestjs/common';
import { DebugService } from './debug.service';
import { DebugController } from './debug.controller';
import { DebugGateway } from './debug.gateway';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DebugController],
  providers: [DebugService, DebugGateway],
  exports: [DebugService],
})
export class DebugModule {}
