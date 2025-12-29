import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

// ============================================================================
// INTERFACES
// ============================================================================

export interface PartitionConfig {
  tableName: string;
  partitionColumn: string;
  partitionType: 'range' | 'list' | 'hash';
  retentionDays: number;
  partitionInterval: 'daily' | 'weekly' | 'monthly';
}

export interface PartitionInfo {
  name: string;
  tableName: string;
  startDate: Date;
  endDate: Date;
  rowCount: number;
  sizeBytes: number;
}

export interface PartitionStats {
  tableName: string;
  totalPartitions: number;
  totalRows: number;
  totalSizeBytes: number;
  oldestPartition: Date | null;
  newestPartition: Date | null;
}

// ============================================================================
// PARTITION SERVICE
// ============================================================================

@Injectable()
export class PartitionService implements OnModuleInit {
  private readonly logger = new Logger(PartitionService.name);
  private readonly partitionConfigs: PartitionConfig[];
  private readonly enabled: boolean;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.enabled = this.configService.get<boolean>('DB_PARTITIONING_ENABLED', false);

    // Define partition configurations for tables that benefit from partitioning
    this.partitionConfigs = [
      {
        tableName: 'executions',
        partitionColumn: 'created_at',
        partitionType: 'range',
        retentionDays: this.configService.get<number>('EXECUTION_RETENTION_DAYS', 90),
        partitionInterval: 'monthly',
      },
      {
        tableName: 'execution_logs',
        partitionColumn: 'created_at',
        partitionType: 'range',
        retentionDays: this.configService.get<number>('EXECUTION_LOG_RETENTION_DAYS', 30),
        partitionInterval: 'weekly',
      },
      {
        tableName: 'audit_logs',
        partitionColumn: 'created_at',
        partitionType: 'range',
        retentionDays: this.configService.get<number>('AUDIT_LOG_RETENTION_DAYS', 365),
        partitionInterval: 'monthly',
      },
      {
        tableName: 'workflow_changes',
        partitionColumn: 'changed_at',
        partitionType: 'range',
        retentionDays: this.configService.get<number>('WORKFLOW_CHANGE_RETENTION_DAYS', 180),
        partitionInterval: 'monthly',
      },
    ];
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Database partitioning is disabled');
      return;
    }

    await this.initializePartitioning();
    this.logger.log('Partition service initialized');
  }

  // ============================================================================
  // PARTITION INITIALIZATION
  // ============================================================================

  /**
   * Initialize partitioning for configured tables
   */
  private async initializePartitioning(): Promise<void> {
    for (const config of this.partitionConfigs) {
      try {
        await this.ensurePartitioningEnabled(config);
        await this.createFuturePartitions(config, 3); // Create 3 future partitions
      } catch (error) {
        this.logger.error(`Failed to initialize partitioning for ${config.tableName}`, error);
      }
    }
  }

  /**
   * Ensure table is partitioned (convert if necessary)
   */
  private async ensurePartitioningEnabled(config: PartitionConfig): Promise<void> {
    const isPartitioned = await this.isTablePartitioned(config.tableName);

    if (!isPartitioned) {
      this.logger.log(`Table ${config.tableName} is not partitioned. Conversion required.`);
      // Note: Converting existing table to partitioned requires careful migration
      // This would typically be done via a migration script, not at runtime
      // Here we just log the requirement
      return;
    }

    this.logger.log(`Table ${config.tableName} is already partitioned`);
  }

  /**
   * Check if table is partitioned
   */
  private async isTablePartitioned(tableName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ relkind: string }[]>`
      SELECT relkind
      FROM pg_class
      WHERE relname = ${tableName}
    `;

    return result.length > 0 && result[0].relkind === 'p';
  }

  // ============================================================================
  // PARTITION MANAGEMENT
  // ============================================================================

  /**
   * Create future partitions for a table
   */
  async createFuturePartitions(config: PartitionConfig, count: number): Promise<void> {
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const partitionDate = this.getPartitionDate(now, config.partitionInterval, i);
      const { startDate, endDate } = this.getPartitionBounds(partitionDate, config.partitionInterval);
      const partitionName = this.getPartitionName(config.tableName, startDate, config.partitionInterval);

      const exists = await this.partitionExists(partitionName);
      if (!exists) {
        await this.createPartition(config.tableName, partitionName, config.partitionColumn, startDate, endDate);
        this.logger.log(`Created partition ${partitionName}`);
      }
    }
  }

  /**
   * Create a new partition
   */
  private async createPartition(
    tableName: string,
    partitionName: string,
    columnName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Note: This uses raw SQL and requires the table to already be partitioned
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF ${tableName}
      FOR VALUES FROM ('${startStr}') TO ('${endStr}')
    `);

    // Create indexes on partition
    await this.createPartitionIndexes(partitionName, tableName);
  }

  /**
   * Create indexes on a partition
   */
  private async createPartitionIndexes(partitionName: string, tableName: string): Promise<void> {
    // Common indexes for execution-related tables
    const indexConfigs: Record<string, string[]> = {
      executions: ['workflow_id', 'status', 'created_at'],
      execution_logs: ['execution_id', 'node_id', 'level'],
      audit_logs: ['user_id', 'team_id', 'action'],
      workflow_changes: ['workflow_id', 'user_id'],
    };

    const indexes = indexConfigs[tableName] || [];

    for (const column of indexes) {
      const indexName = `idx_${partitionName}_${column}`;
      try {
        await this.prisma.$executeRawUnsafe(`
          CREATE INDEX IF NOT EXISTS ${indexName} ON ${partitionName} (${column})
        `);
      } catch (error) {
        // Index might already exist
        this.logger.debug(`Index ${indexName} already exists or could not be created`);
      }
    }
  }

  /**
   * Check if partition exists
   */
  private async partitionExists(partitionName: string): Promise<boolean> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM pg_class
      WHERE relname = ${partitionName}
    `;

    return result.length > 0 && Number(result[0].count) > 0;
  }

  // ============================================================================
  // PARTITION CLEANUP
  // ============================================================================

  /**
   * Drop old partitions based on retention policy
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldPartitions(): Promise<void> {
    if (!this.enabled) return;

    this.logger.log('Starting partition cleanup');

    for (const config of this.partitionConfigs) {
      try {
        await this.dropExpiredPartitions(config);
      } catch (error) {
        this.logger.error(`Failed to cleanup partitions for ${config.tableName}`, error);
      }
    }

    this.logger.log('Partition cleanup completed');
  }

  /**
   * Drop partitions older than retention period
   */
  private async dropExpiredPartitions(config: PartitionConfig): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    const partitions = await this.getTablePartitions(config.tableName);

    for (const partition of partitions) {
      if (partition.endDate < cutoffDate) {
        // Check if partition has been archived
        const isArchived = await this.isPartitionArchived(partition.name);

        if (isArchived || !this.configService.get<boolean>('ARCHIVE_BEFORE_DROP', true)) {
          await this.dropPartition(partition.name);
          this.logger.log(`Dropped expired partition ${partition.name}`);

          this.eventEmitter.emit('partition.dropped', {
            tableName: config.tableName,
            partitionName: partition.name,
            rowCount: partition.rowCount,
          });
        } else {
          this.logger.warn(`Partition ${partition.name} not archived, skipping drop`);
        }
      }
    }
  }

  /**
   * Drop a partition
   */
  private async dropPartition(partitionName: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${partitionName}`);
  }

  /**
   * Check if partition has been archived
   */
  private async isPartitionArchived(partitionName: string): Promise<boolean> {
    // Check archive metadata (stored in a tracking table or Redis)
    // For now, we assume not archived - the archive service will set this
    return false;
  }

  // ============================================================================
  // PARTITION MAINTENANCE
  // ============================================================================

  /**
   * Scheduled job to create future partitions
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async maintainPartitions(): Promise<void> {
    if (!this.enabled) return;

    this.logger.log('Starting partition maintenance');

    for (const config of this.partitionConfigs) {
      try {
        // Ensure we have partitions for the next 3 periods
        await this.createFuturePartitions(config, 3);

        // Analyze partitions for query optimization
        await this.analyzePartitions(config.tableName);
      } catch (error) {
        this.logger.error(`Failed to maintain partitions for ${config.tableName}`, error);
      }
    }

    this.logger.log('Partition maintenance completed');
  }

  /**
   * Analyze partitions for query optimization
   */
  private async analyzePartitions(tableName: string): Promise<void> {
    const partitions = await this.getTablePartitions(tableName);

    // Only analyze recent partitions (last 3)
    const recentPartitions = partitions.slice(-3);

    for (const partition of recentPartitions) {
      try {
        await this.prisma.$executeRawUnsafe(`ANALYZE ${partition.name}`);
      } catch (error) {
        this.logger.debug(`Failed to analyze ${partition.name}`);
      }
    }
  }

  // ============================================================================
  // PARTITION QUERIES
  // ============================================================================

  /**
   * Get all partitions for a table
   */
  async getTablePartitions(tableName: string): Promise<PartitionInfo[]> {
    const result = await this.prisma.$queryRaw<
      {
        relname: string;
        pg_get_expr: string;
        reltuples: number;
        pg_total_relation_size: bigint;
      }[]
    >`
      SELECT
        c.relname,
        pg_get_expr(c.relpartbound, c.oid) as pg_get_expr,
        c.reltuples,
        pg_total_relation_size(c.oid) as pg_total_relation_size
      FROM pg_class c
      JOIN pg_inherits i ON c.oid = i.inhrelid
      JOIN pg_class p ON i.inhparent = p.oid
      WHERE p.relname = ${tableName}
      ORDER BY c.relname
    `;

    return result.map((row) => {
      const bounds = this.parsePartitionBounds(row.pg_get_expr);
      return {
        name: row.relname,
        tableName,
        startDate: bounds.start,
        endDate: bounds.end,
        rowCount: Math.floor(row.reltuples),
        sizeBytes: Number(row.pg_total_relation_size),
      };
    });
  }

  /**
   * Parse partition bounds from PostgreSQL expression
   */
  private parsePartitionBounds(expr: string): { start: Date; end: Date } {
    // Parse: FOR VALUES FROM ('2024-01-01') TO ('2024-02-01')
    const matches = expr.match(/FROM \('([^']+)'\) TO \('([^']+)'\)/);
    if (matches) {
      return {
        start: new Date(matches[1]),
        end: new Date(matches[2]),
      };
    }
    return { start: new Date(), end: new Date() };
  }

  /**
   * Get partition statistics for a table
   */
  async getPartitionStats(tableName: string): Promise<PartitionStats> {
    const partitions = await this.getTablePartitions(tableName);

    const totalRows = partitions.reduce((sum, p) => sum + p.rowCount, 0);
    const totalSizeBytes = partitions.reduce((sum, p) => sum + p.sizeBytes, 0);

    const dates = partitions.map((p) => p.startDate).filter((d) => d);
    const oldestPartition = dates.length > 0 ? new Date(Math.min(...dates.map((d) => d.getTime()))) : null;
    const newestPartition = dates.length > 0 ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null;

    return {
      tableName,
      totalPartitions: partitions.length,
      totalRows,
      totalSizeBytes,
      oldestPartition,
      newestPartition,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getPartitionDate(base: Date, interval: string, offset: number): Date {
    const date = new Date(base);

    switch (interval) {
      case 'daily':
        date.setDate(date.getDate() + offset);
        break;
      case 'weekly':
        date.setDate(date.getDate() + offset * 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + offset);
        break;
    }

    return date;
  }

  private getPartitionBounds(
    date: Date,
    interval: string,
  ): { startDate: Date; endDate: Date } {
    const startDate = new Date(date);
    const endDate = new Date(date);

    switch (interval) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case 'weekly':
        // Start of week (Monday)
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
        endDate.setTime(startDate.getTime());
        endDate.setDate(endDate.getDate() + 7);
        break;
      case 'monthly':
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setTime(startDate.getTime());
        endDate.setMonth(endDate.getMonth() + 1);
        break;
    }

    return { startDate, endDate };
  }

  private getPartitionName(tableName: string, date: Date, interval: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    switch (interval) {
      case 'daily':
        return `${tableName}_y${year}m${month}d${day}`;
      case 'weekly':
        const week = this.getWeekNumber(date);
        return `${tableName}_y${year}w${String(week).padStart(2, '0')}`;
      case 'monthly':
        return `${tableName}_y${year}m${month}`;
      default:
        return `${tableName}_${date.getTime()}`;
    }
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get all partition configurations
   */
  getConfigurations(): PartitionConfig[] {
    return [...this.partitionConfigs];
  }

  /**
   * Check if partitioning is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get statistics for all partitioned tables
   */
  async getAllStats(): Promise<PartitionStats[]> {
    const stats: PartitionStats[] = [];

    for (const config of this.partitionConfigs) {
      try {
        const tableStat = await this.getPartitionStats(config.tableName);
        stats.push(tableStat);
      } catch {
        // Table might not be partitioned yet
      }
    }

    return stats;
  }
}
