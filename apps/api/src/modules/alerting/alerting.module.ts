import { Module } from '@nestjs/common';
import { AlertingService } from './alerting.service';
import { AlertingController } from './alerting.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [AlertingService],
  controllers: [AlertingController],
  exports: [AlertingService],
})
export class AlertingModule {}
