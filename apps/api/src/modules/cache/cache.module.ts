import { Module, Global } from '@nestjs/common';
import { NodeCacheService } from './node-cache.service';
import { IntelligentCacheService } from './intelligent-cache.service';
import { DistributedCacheService } from './distributed-cache.service';
import { CacheController } from './cache.controller';
import { DatabaseModule } from '../../database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [NodeCacheService, IntelligentCacheService, DistributedCacheService],
  controllers: [CacheController],
  exports: [NodeCacheService, IntelligentCacheService, DistributedCacheService],
})
export class CacheModule {}
