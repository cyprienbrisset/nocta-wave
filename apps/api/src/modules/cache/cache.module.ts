import { Module } from '@nestjs/common';
import { NodeCacheService } from './node-cache.service';
import { CacheController } from './cache.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [NodeCacheService],
  controllers: [CacheController],
  exports: [NodeCacheService],
})
export class CacheModule {}
