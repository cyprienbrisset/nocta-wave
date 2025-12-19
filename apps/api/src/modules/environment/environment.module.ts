import { Module } from '@nestjs/common';
import { EnvironmentController } from './environment.controller';
import { EnvironmentService } from './environment.service';
import { DatabaseModule } from '../../database/database.module';
import { CredentialModule } from '../credential/credential.module';

@Module({
  imports: [DatabaseModule, CredentialModule],
  controllers: [EnvironmentController],
  providers: [EnvironmentService],
  exports: [EnvironmentService],
})
export class EnvironmentModule {}
