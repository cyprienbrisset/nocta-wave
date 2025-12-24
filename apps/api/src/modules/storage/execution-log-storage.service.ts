import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ObjectStorageService, StoredDataReference } from './storage.service';

/**
 * ExecutionLogStorageService - Hybrid storage for execution logs
 *
 * STRATEGY:
 * - Small data (< threshold): Stored inline in PostgreSQL (fast access)
 * - Large data (>= threshold): Stored in object storage with reference in PostgreSQL
 *
 * This approach:
 * - Reduces PostgreSQL storage and I/O for large payloads
 * - Maintains fast access for small, frequently-accessed data
 * - Falls back gracefully when object storage is unavailable
 */

export interface ExecutionLogData {
  inputData?: unknown;
  outputData?: unknown;
}

export interface StorageResult {
  // Inline data (stored directly in PostgreSQL if small enough)
  inputData?: unknown;
  outputData?: unknown;
  // References to object storage (if data was externalized)
  inputDataRef?: StoredDataReference;
  outputDataRef?: StoredDataReference;
}

// Size threshold for externalizing data (in bytes)
const EXTERNALIZE_THRESHOLD = 10 * 1024; // 10KB

@Injectable()
export class ExecutionLogStorageService {
  private readonly logger = new Logger(ExecutionLogStorageService.name);

  constructor(
    private prisma: PrismaService,
    private objectStorage: ObjectStorageService,
  ) {}

  /**
   * Store execution log data with automatic externalization
   *
   * Returns both inline data (for small payloads) and references (for large payloads)
   */
  async storeLogData(
    executionId: string,
    nodeId: string,
    data: ExecutionLogData,
  ): Promise<StorageResult> {
    const result: StorageResult = {};

    // Process input data
    if (data.inputData !== undefined) {
      const inputSize = this.getDataSize(data.inputData);

      if (this.objectStorage.isEnabled() && inputSize >= EXTERNALIZE_THRESHOLD) {
        // Store in object storage
        const ref = await this.objectStorage.storeExecutionLogData(
          executionId,
          nodeId,
          'input',
          data.inputData,
        );
        if (ref) {
          result.inputDataRef = ref;
          // Store a small summary instead of full data
          result.inputData = this.createDataSummary(data.inputData, inputSize);
        } else {
          // Fallback to inline if storage fails
          result.inputData = data.inputData;
        }
      } else {
        // Store inline
        result.inputData = data.inputData;
      }
    }

    // Process output data
    if (data.outputData !== undefined) {
      const outputSize = this.getDataSize(data.outputData);

      if (this.objectStorage.isEnabled() && outputSize >= EXTERNALIZE_THRESHOLD) {
        // Store in object storage
        const ref = await this.objectStorage.storeExecutionLogData(
          executionId,
          nodeId,
          'output',
          data.outputData,
        );
        if (ref) {
          result.outputDataRef = ref;
          // Store a small summary instead of full data
          result.outputData = this.createDataSummary(data.outputData, outputSize);
        } else {
          // Fallback to inline if storage fails
          result.outputData = data.outputData;
        }
      } else {
        // Store inline
        result.outputData = data.outputData;
      }
    }

    return result;
  }

  /**
   * Retrieve full execution log data, fetching from object storage if needed
   */
  async getFullLogData(
    logRecord: {
      inputData?: unknown;
      outputData?: unknown;
      inputDataRef?: unknown;
      outputDataRef?: unknown;
    },
  ): Promise<ExecutionLogData> {
    const result: ExecutionLogData = {};

    // Retrieve input data
    if (logRecord.inputDataRef) {
      const ref = logRecord.inputDataRef as StoredDataReference;
      const fullData = await this.objectStorage.getExecutionLogData(ref);
      result.inputData = fullData ?? logRecord.inputData;
    } else {
      result.inputData = logRecord.inputData;
    }

    // Retrieve output data
    if (logRecord.outputDataRef) {
      const ref = logRecord.outputDataRef as StoredDataReference;
      const fullData = await this.objectStorage.getExecutionLogData(ref);
      result.outputData = fullData ?? logRecord.outputData;
    } else {
      result.outputData = logRecord.outputData;
    }

    return result;
  }

  /**
   * Clean up externalized data when execution is deleted
   */
  async cleanupExecutionData(executionId: string): Promise<void> {
    if (!this.objectStorage.isEnabled()) {
      return;
    }

    const deletedCount = await this.objectStorage.deleteExecutionData(executionId);
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} externalized log files for execution ${executionId}`);
    }
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private getDataSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  /**
   * Create a summary for large externalized data
   * This is stored in PostgreSQL for quick access without fetching the full data
   */
  private createDataSummary(data: unknown, originalSize: number): Record<string, unknown> {
    const summary: Record<string, unknown> = {
      __externalized: true,
      __originalSize: originalSize,
      __sizeFormatted: this.formatBytes(originalSize),
    };

    // Include type information
    if (Array.isArray(data)) {
      summary.__type = 'array';
      summary.__length = data.length;
      // Include first item preview if it's an array
      if (data.length > 0 && typeof data[0] === 'object') {
        summary.__firstItemKeys = Object.keys(data[0] || {}).slice(0, 5);
      }
    } else if (typeof data === 'object' && data !== null) {
      summary.__type = 'object';
      summary.__keys = Object.keys(data).slice(0, 10);
    } else {
      summary.__type = typeof data;
    }

    return summary;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Check if data has been externalized
   */
  isExternalized(data: unknown): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      (data as Record<string, unknown>).__externalized === true
    );
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    objectStorage: {
      enabled: boolean;
      bucket: string;
      objectCount?: number;
      totalSize?: number;
    };
    externalizedLogs: number;
  }> {
    const objectStorageStats = await this.objectStorage.getStorageStats();

    // Count logs with externalized data
    // Using Prisma.DbNull for JSON null comparison
    const externalizedLogs = await this.prisma.executionLog.count({
      where: {
        OR: [
          { NOT: { inputDataRef: { equals: undefined } } },
          { NOT: { outputDataRef: { equals: undefined } } },
        ],
      },
    });

    return {
      objectStorage: objectStorageStats,
      externalizedLogs,
    };
  }
}
