import { Module } from '@nestjs/common';
import { PartitionService } from './partition.service';
import { ArchiveService } from './archive.service';
import { ReadReplicaService } from './read-replica.service';
import { ConnectionPoolService } from './connection-pool.service';
import { DatabaseOptimizationController } from './database-optimization.controller';
import { DatabaseModule } from '../../database/database.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [DatabaseModule, StorageModule],
  providers: [
    PartitionService,
    ArchiveService,
    ReadReplicaService,
    ConnectionPoolService,
  ],
  controllers: [DatabaseOptimizationController],
  exports: [
    PartitionService,
    ArchiveService,
    ReadReplicaService,
    ConnectionPoolService,
  ],
})
export class DatabaseOptimizationModule {}
