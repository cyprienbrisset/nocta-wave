import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ObjectStorageService } from '../storage/storage.service';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// ============================================================================
// INTERFACES
// ============================================================================

export interface ArchiveConfig {
  tableName: string;
  archiveColumn: string;
  retentionDays: number;
  batchSize: number;
  compressionEnabled: boolean;
}

export interface ArchiveJob {
  id: string;
  tableName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  rowsArchived: number;
  bytesArchived: number;
  error?: string;
}

export interface ArchiveMetadata {
  id: string;
  tableName: string;
  startDate: Date;
  endDate: Date;
  rowCount: number;
  originalSize: number;
  compressedSize: number;
  storagePath: string;
  checksum: string;
  archivedAt: Date;
}

export interface RestoreOptions {
  tableName: string;
  startDate?: Date;
  endDate?: Date;
  targetTable?: string;
  limit?: number;
}

// ============================================================================
// ARCHIVE SERVICE
// ============================================================================

@Injectable()
export class ArchiveService {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly archiveConfigs: ArchiveConfig[];
  private readonly enabled: boolean;
  private readonly storageBucket: string;
  private activeJobs = new Map<string, ArchiveJob>();

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
    private storageService: ObjectStorageService,
  ) {
    this.enabled = this.configService.get<boolean>('ARCHIVE_ENABLED', false);
    this.storageBucket = this.configService.get<string>('ARCHIVE_BUCKET', 'wsflows-archives');

    this.archiveConfigs = [
      {
        tableName: 'executions',
        archiveColumn: 'created_at',
        retentionDays: this.configService.get<number>('EXECUTION_HOT_RETENTION_DAYS', 30),
        batchSize: 1000,
        compressionEnabled: true,
      },
      {
        tableName: 'execution_logs',
        archiveColumn: 'created_at',
        retentionDays: this.configService.get<number>('EXECUTION_LOG_HOT_RETENTION_DAYS', 7),
        batchSize: 5000,
        compressionEnabled: true,
      },
      {
        tableName: 'audit_logs',
        archiveColumn: 'created_at',
        retentionDays: this.configService.get<number>('AUDIT_LOG_HOT_RETENTION_DAYS', 90),
        batchSize: 2000,
        compressionEnabled: true,
      },
    ];
  }

  // ============================================================================
  // ARCHIVAL JOBS
  // ============================================================================

  /**
   * Scheduled archive job - runs daily at 3 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runScheduledArchive(): Promise<void> {
    if (!this.enabled) return;

    this.logger.log('Starting scheduled archive job');

    for (const config of this.archiveConfigs) {
      try {
        await this.archiveTable(config);
      } catch (error) {
        this.logger.error(`Failed to archive ${config.tableName}`, error);
      }
    }

    this.logger.log('Scheduled archive job completed');
  }

  /**
   * Archive data from a table to cold storage
   */
  async archiveTable(config: ArchiveConfig): Promise<ArchiveJob> {
    const jobId = `archive-${config.tableName}-${Date.now()}`;
    const job: ArchiveJob = {
      id: jobId,
      tableName: config.tableName,
      status: 'running',
      startedAt: new Date(),
      rowsArchived: 0,
      bytesArchived: 0,
    };

    this.activeJobs.set(jobId, job);
    this.logger.log(`Starting archive job ${jobId} for ${config.tableName}`);

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

      // Process in batches
      let totalArchived = 0;
      let hasMore = true;
      let batchNumber = 0;

      while (hasMore) {
        const result = await this.archiveBatch(config, cutoffDate, batchNumber);
        totalArchived += result.rowCount;
        job.rowsArchived = totalArchived;
        job.bytesArchived += result.bytesArchived;

        hasMore = result.hasMore;
        batchNumber++;

        // Emit progress event
        this.eventEmitter.emit('archive.progress', {
          jobId,
          tableName: config.tableName,
          rowsArchived: totalArchived,
          batchNumber,
        });
      }

      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.log(`Archive job ${jobId} completed: ${totalArchived} rows archived`);

      this.eventEmitter.emit('archive.completed', {
        jobId,
        tableName: config.tableName,
        rowsArchived: totalArchived,
        bytesArchived: job.bytesArchived,
      });

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : String(error);
      job.completedAt = new Date();

      this.logger.error(`Archive job ${jobId} failed`, error);

      this.eventEmitter.emit('archive.failed', {
        jobId,
        tableName: config.tableName,
        error: job.error,
      });
    }

    return job;
  }

  /**
   * Archive a single batch of data
   */
  private async archiveBatch(
    config: ArchiveConfig,
    cutoffDate: Date,
    batchNumber: number,
  ): Promise<{ rowCount: number; bytesArchived: number; hasMore: boolean }> {
    // Fetch batch of data
    const rows = await this.fetchBatch(config.tableName, config.archiveColumn, cutoffDate, config.batchSize);

    if (rows.length === 0) {
      return { rowCount: 0, bytesArchived: 0, hasMore: false };
    }

    // Serialize to JSON
    const jsonData = JSON.stringify(rows);
    let dataToStore = Buffer.from(jsonData, 'utf8');
    const originalSize = dataToStore.length;

    // Compress if enabled
    if (config.compressionEnabled) {
      dataToStore = await gzip(dataToStore);
    }

    // Generate storage path
    const now = new Date();
    const storagePath = this.generateStoragePath(config.tableName, now, batchNumber);

    // Calculate checksum
    const checksum = this.calculateChecksum(dataToStore);

    // Store to cold storage
    await this.storageService.uploadBuffer(
      this.storageBucket,
      storagePath,
      dataToStore,
      {
        contentType: config.compressionEnabled ? 'application/gzip' : 'application/json',
        metadata: {
          tableName: config.tableName,
          rowCount: String(rows.length),
          originalSize: String(originalSize),
          checksum,
          archivedAt: now.toISOString(),
        },
      },
    );

    // Store archive metadata
    const metadata: ArchiveMetadata = {
      id: `${config.tableName}-${batchNumber}-${now.getTime()}`,
      tableName: config.tableName,
      startDate: this.getMinDate(rows, config.archiveColumn),
      endDate: this.getMaxDate(rows, config.archiveColumn),
      rowCount: rows.length,
      originalSize,
      compressedSize: dataToStore.length,
      storagePath,
      checksum,
      archivedAt: now,
    };

    await this.saveArchiveMetadata(metadata);

    // Delete archived rows from source table
    const ids = rows.map((row: any) => row.id);
    await this.deleteArchivedRows(config.tableName, ids);

    return {
      rowCount: rows.length,
      bytesArchived: dataToStore.length,
      hasMore: rows.length === config.batchSize,
    };
  }

  /**
   * Fetch a batch of rows to archive
   */
  private async fetchBatch(
    tableName: string,
    columnName: string,
    cutoffDate: Date,
    limit: number,
  ): Promise<any[]> {
    const query = `
      SELECT *
      FROM "${tableName}"
      WHERE "${columnName}" < $1
      ORDER BY "${columnName}" ASC
      LIMIT $2
    `;

    return this.prisma.$queryRawUnsafe(query, cutoffDate, limit);
  }

  /**
   * Delete rows that have been archived
   */
  private async deleteArchivedRows(tableName: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
    const query = `DELETE FROM "${tableName}" WHERE id IN (${placeholders})`;

    await this.prisma.$executeRawUnsafe(query, ...ids);
  }

  // ============================================================================
  // RESTORATION
  // ============================================================================

  /**
   * Restore archived data
   */
  async restore(options: RestoreOptions): Promise<number> {
    this.logger.log(`Starting restore for ${options.tableName}`);

    // Find relevant archive files
    const archives = await this.findArchives(options);

    if (archives.length === 0) {
      this.logger.log('No archives found matching criteria');
      return 0;
    }

    let totalRestored = 0;
    const targetTable = options.targetTable || `${options.tableName}_restored`;

    // Ensure target table exists
    await this.ensureRestoreTable(options.tableName, targetTable);

    for (const archive of archives) {
      const restored = await this.restoreArchive(archive, targetTable, options.limit);
      totalRestored += restored;

      if (options.limit && totalRestored >= options.limit) {
        break;
      }
    }

    this.logger.log(`Restore completed: ${totalRestored} rows restored to ${targetTable}`);

    this.eventEmitter.emit('archive.restored', {
      tableName: options.tableName,
      targetTable,
      rowsRestored: totalRestored,
    });

    return totalRestored;
  }

  /**
   * Restore a single archive file
   */
  private async restoreArchive(
    metadata: ArchiveMetadata,
    targetTable: string,
    limit?: number,
  ): Promise<number> {
    // Download from storage
    const data = await this.storageService.downloadBuffer(this.storageBucket, metadata.storagePath);

    // Verify checksum
    const checksum = this.calculateChecksum(data);
    if (checksum !== metadata.checksum) {
      throw new Error(`Checksum mismatch for archive ${metadata.id}`);
    }

    // Decompress if needed
    let jsonData: string;
    if (metadata.storagePath.endsWith('.gz')) {
      const decompressed = await gunzip(data);
      jsonData = decompressed.toString('utf8');
    } else {
      jsonData = data.toString('utf8');
    }

    // Parse rows
    let rows = JSON.parse(jsonData);

    if (limit) {
      rows = rows.slice(0, limit);
    }

    // Insert into target table
    await this.insertRows(targetTable, rows);

    return rows.length;
  }

  /**
   * Create restore table if it doesn't exist
   */
  private async ensureRestoreTable(sourceTable: string, targetTable: string): Promise<void> {
    await this.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "${targetTable}" (LIKE "${sourceTable}" INCLUDING ALL)
    `);
  }

  /**
   * Insert rows into target table
   */
  private async insertRows(tableName: string, rows: any[]): Promise<void> {
    if (rows.length === 0) return;

    const columns = Object.keys(rows[0]);
    const columnList = columns.map((c) => `"${c}"`).join(', ');

    // Build values clause
    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    rows.forEach((row, rowIndex) => {
      const rowPlaceholders: string[] = [];
      columns.forEach((col, colIndex) => {
        const paramIndex = rowIndex * columns.length + colIndex + 1;
        rowPlaceholders.push(`$${paramIndex}`);
        values.push(row[col]);
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `
      INSERT INTO "${tableName}" (${columnList})
      VALUES ${valuePlaceholders.join(', ')}
      ON CONFLICT (id) DO NOTHING
    `;

    await this.prisma.$executeRawUnsafe(query, ...values);
  }

  // ============================================================================
  // METADATA MANAGEMENT
  // ============================================================================

  /**
   * Save archive metadata
   */
  private async saveArchiveMetadata(metadata: ArchiveMetadata): Promise<void> {
    // Store in a dedicated archive_metadata table
    await this.prisma.$executeRaw`
      INSERT INTO archive_metadata (id, table_name, start_date, end_date, row_count, original_size, compressed_size, storage_path, checksum, archived_at)
      VALUES (${metadata.id}, ${metadata.tableName}, ${metadata.startDate}, ${metadata.endDate}, ${metadata.rowCount}, ${metadata.originalSize}, ${metadata.compressedSize}, ${metadata.storagePath}, ${metadata.checksum}, ${metadata.archivedAt})
      ON CONFLICT (id) DO UPDATE SET
        row_count = EXCLUDED.row_count,
        storage_path = EXCLUDED.storage_path
    `;
  }

  /**
   * Find archives matching criteria
   */
  private async findArchives(options: RestoreOptions): Promise<ArchiveMetadata[]> {
    let query = `
      SELECT *
      FROM archive_metadata
      WHERE table_name = $1
    `;
    const params: any[] = [options.tableName];
    let paramIndex = 2;

    if (options.startDate) {
      query += ` AND end_date >= $${paramIndex}`;
      params.push(options.startDate);
      paramIndex++;
    }

    if (options.endDate) {
      query += ` AND start_date <= $${paramIndex}`;
      params.push(options.endDate);
      paramIndex++;
    }

    query += ' ORDER BY start_date ASC';

    const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);

    return results.map((row) => ({
      id: row.id,
      tableName: row.table_name,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      rowCount: row.row_count,
      originalSize: row.original_size,
      compressedSize: row.compressed_size,
      storagePath: row.storage_path,
      checksum: row.checksum,
      archivedAt: new Date(row.archived_at),
    }));
  }

  /**
   * Get archive statistics
   */
  async getArchiveStats(): Promise<{
    totalArchives: number;
    totalRows: number;
    totalOriginalSize: number;
    totalCompressedSize: number;
    byTable: Record<string, { archives: number; rows: number; size: number }>;
  }> {
    const results = await this.prisma.$queryRaw<
      {
        table_name: string;
        count: bigint;
        sum_rows: bigint;
        sum_original: bigint;
        sum_compressed: bigint;
      }[]
    >`
      SELECT
        table_name,
        COUNT(*) as count,
        SUM(row_count) as sum_rows,
        SUM(original_size) as sum_original,
        SUM(compressed_size) as sum_compressed
      FROM archive_metadata
      GROUP BY table_name
    `;

    const byTable: Record<string, { archives: number; rows: number; size: number }> = {};
    let totalArchives = 0;
    let totalRows = 0;
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    for (const row of results) {
      const archives = Number(row.count);
      const rows = Number(row.sum_rows);
      const size = Number(row.sum_compressed);

      byTable[row.table_name] = { archives, rows, size };
      totalArchives += archives;
      totalRows += rows;
      totalOriginalSize += Number(row.sum_original);
      totalCompressedSize += size;
    }

    return {
      totalArchives,
      totalRows,
      totalOriginalSize,
      totalCompressedSize,
      byTable,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateStoragePath(tableName: string, date: Date, batchNumber: number): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `archives/${tableName}/${year}/${month}/${day}/batch_${batchNumber}.json.gz`;
  }

  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  private getMinDate(rows: any[], column: string): Date {
    const dates = rows.map((r) => new Date(r[column])).filter((d) => !isNaN(d.getTime()));
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }

  private getMaxDate(rows: any[], column: string): Date {
    const dates = rows.map((r) => new Date(r[column])).filter((d) => !isNaN(d.getTime()));
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Get active archive jobs
   */
  getActiveJobs(): ArchiveJob[] {
    return [...this.activeJobs.values()];
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): ArchiveJob | null {
    return this.activeJobs.get(jobId) || null;
  }

  /**
   * Manual trigger for archiving a specific table
   */
  async archiveTableManual(tableName: string): Promise<ArchiveJob | null> {
    const config = this.archiveConfigs.find((c) => c.tableName === tableName);
    if (!config) {
      this.logger.warn(`No archive config found for table ${tableName}`);
      return null;
    }

    return this.archiveTable(config);
  }

  /**
   * Check if archiving is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
