import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PartitionService, PartitionConfig, PartitionStats, PartitionInfo } from './partition.service';
import { ArchiveService, ArchiveJob } from './archive.service';
import { ReadReplicaService, ReplicaStats, ReplicaConfig } from './read-replica.service';
import { ConnectionPoolService, PoolConfig, PoolStats, PoolHealthStatus } from './connection-pool.service';

@ApiTags('database-optimization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('db-optimization')
export class DatabaseOptimizationController {
  constructor(
    private partitionService: PartitionService,
    private archiveService: ArchiveService,
    private readReplicaService: ReadReplicaService,
    private connectionPoolService: ConnectionPoolService,
  ) {}

  // ============================================================================
  // PARTITIONING
  // ============================================================================

  @Get('partitions/status')
  @ApiOperation({ summary: 'Get partitioning status' })
  async getPartitioningStatus() {
    return {
      enabled: this.partitionService.isEnabled(),
      configurations: this.partitionService.getConfigurations(),
    };
  }

  @Get('partitions/stats')
  @ApiOperation({ summary: 'Get partition statistics' })
  async getPartitionStats() {
    return this.partitionService.getAllStats();
  }

  @Get('partitions/:tableName')
  @ApiOperation({ summary: 'Get partitions for a table' })
  async getTablePartitions(@Param('tableName') tableName: string) {
    return this.partitionService.getTablePartitions(tableName);
  }

  // ============================================================================
  // ARCHIVING
  // ============================================================================

  @Get('archive/status')
  @ApiOperation({ summary: 'Get archive status' })
  async getArchiveStatus() {
    return {
      enabled: this.archiveService.isEnabled(),
      activeJobs: this.archiveService.getActiveJobs(),
    };
  }

  @Get('archive/stats')
  @ApiOperation({ summary: 'Get archive statistics' })
  async getArchiveStats() {
    return this.archiveService.getArchiveStats();
  }

  @Post('archive/trigger/:tableName')
  @ApiOperation({ summary: 'Trigger archive for a table' })
  async triggerArchive(@Param('tableName') tableName: string) {
    const job = await this.archiveService.archiveTableManual(tableName);
    return job || { error: 'No archive config found for table' };
  }

  @Post('archive/restore')
  @ApiOperation({ summary: 'Restore archived data' })
  async restoreArchive(
    @Body()
    body: {
      tableName: string;
      startDate?: string;
      endDate?: string;
      targetTable?: string;
      limit?: number;
    },
  ) {
    const restored = await this.archiveService.restore({
      tableName: body.tableName,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      targetTable: body.targetTable,
      limit: body.limit,
    });
    return { rowsRestored: restored };
  }

  // ============================================================================
  // READ REPLICAS
  // ============================================================================

  @Get('replicas/status')
  @ApiOperation({ summary: 'Get read replica status' })
  async getReplicaStatus() {
    return this.readReplicaService.getStatus();
  }

  @Get('replicas/stats')
  @ApiOperation({ summary: 'Get replica statistics' })
  async getReplicaStats() {
    return this.readReplicaService.getReplicaStats();
  }

  @Get('replicas/config')
  @ApiOperation({ summary: 'Get replica configurations' })
  async getReplicaConfigs() {
    return this.readReplicaService.getReplicaConfigs();
  }

  @Post('replicas/health-check')
  @ApiOperation({ summary: 'Force health check on replicas' })
  async forceReplicaHealthCheck() {
    await this.readReplicaService.forceHealthCheck();
    return { success: true };
  }

  // ============================================================================
  // CONNECTION POOL
  // ============================================================================

  @Get('pool/status')
  @ApiOperation({ summary: 'Get connection pool status' })
  async getPoolStatus() {
    return {
      config: this.connectionPoolService.getConfig(),
      stats: this.connectionPoolService.getStats(),
      health: this.connectionPoolService.getHealthStatus(),
    };
  }

  @Get('pool/recommendations')
  @ApiOperation({ summary: 'Get pool optimization recommendations' })
  async getPoolRecommendations() {
    return {
      recommendations: this.connectionPoolService.getOptimizationRecommendations(),
      optimalSize: this.connectionPoolService.calculateOptimalPoolSize(),
    };
  }

  @Get('pool/pgbouncer-config')
  @ApiOperation({ summary: 'Get recommended PgBouncer configuration' })
  async getPgBouncerConfig() {
    return this.connectionPoolService.getRecommendedPgBouncerConfig();
  }

  @Post('pool/refresh')
  @ApiOperation({ summary: 'Refresh connection pool' })
  async refreshPool() {
    await this.connectionPoolService.refreshPool();
    return { success: true };
  }
}
