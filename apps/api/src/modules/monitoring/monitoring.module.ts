import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';
import { MonitoringGateway } from './monitoring.gateway';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [TeamModule],
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringGateway],
  exports: [MonitoringService],
})
export class MonitoringModule {}
