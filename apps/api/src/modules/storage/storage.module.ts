import { Module, Global } from '@nestjs/common';
import { ObjectStorageService } from './storage.service';
import { ExecutionLogStorageService } from './execution-log-storage.service';

@Global()
@Module({
  providers: [ObjectStorageService, ExecutionLogStorageService],
  exports: [ObjectStorageService, ExecutionLogStorageService],
})
export class StorageModule {}
