import { Module } from '@nestjs/common';
import { CredentialController } from './credential.controller';
import { CredentialService } from './credential.service';
import { EncryptionService } from './encryption.service';
import { TeamModule } from '../team/team.module';

@Module({
  imports: [TeamModule],
  controllers: [CredentialController],
  providers: [CredentialService, EncryptionService],
  exports: [CredentialService, EncryptionService],
})
export class CredentialModule {}
