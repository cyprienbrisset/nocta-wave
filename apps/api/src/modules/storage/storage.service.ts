import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export interface StorageOptions {
  compress?: boolean;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StoredDataReference {
  bucket: string;
  key: string;
  size: number;
  compressed: boolean;
  checksum: string;
  storedAt: string;
}

/**
 * ObjectStorageService - Abstraction for S3-compatible object storage
 *
 * Used to externalize large execution log data from PostgreSQL.
 * Supports MinIO (self-hosted) or any S3-compatible provider.
 *
 * Benefits:
 * - Reduces PostgreSQL I/O and storage size
 * - Unlimited scalability for log data
 * - Cost-effective storage with lifecycle policies
 * - Optional compression for further size reduction
 */
@Injectable()
export class ObjectStorageService implements OnModuleInit {
  private readonly logger = new Logger(ObjectStorageService.name);
  private client: S3Client | null = null;
  private readonly bucket: string;
  private readonly enabled: boolean;
  private readonly compressionThreshold: number;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('OBJECT_STORAGE_ENABLED', false);
    this.bucket = this.configService.get<string>('OBJECT_STORAGE_BUCKET', 'wsflows-logs');
    this.compressionThreshold = this.configService.get<number>(
      'OBJECT_STORAGE_COMPRESSION_THRESHOLD',
      1024, // Compress data larger than 1KB
    );

    if (this.enabled) {
      this.client = new S3Client({
        endpoint: this.configService.get<string>('OBJECT_STORAGE_ENDPOINT', 'http://localhost:9000'),
        region: this.configService.get<string>('OBJECT_STORAGE_REGION', 'us-east-1'),
        credentials: {
          accessKeyId: this.configService.get<string>('OBJECT_STORAGE_ACCESS_KEY', 'minioadmin'),
          secretAccessKey: this.configService.get<string>('OBJECT_STORAGE_SECRET_KEY', 'minioadmin'),
        },
        forcePathStyle: true, // Required for MinIO
      });
    }
  }

  async onModuleInit() {
    if (!this.enabled || !this.client) {
      this.logger.log('Object storage disabled - execution logs stored in PostgreSQL');
      return;
    }

    try {
      await this.ensureBucketExists();
      this.logger.log(`Object storage initialized (bucket: ${this.bucket})`);
    } catch (error) {
      this.logger.error('Failed to initialize object storage:', error);
      this.logger.warn('Falling back to PostgreSQL for execution logs');
    }
  }

  /**
   * Check if object storage is available
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Store execution log data in object storage
   */
  async storeExecutionLogData(
    executionId: string,
    nodeId: string,
    dataType: 'input' | 'output',
    data: unknown,
  ): Promise<StoredDataReference | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const key = this.buildKey(executionId, nodeId, dataType);
    const jsonData = JSON.stringify(data);
    const shouldCompress = jsonData.length > this.compressionThreshold;

    let bodyData: Buffer;
    if (shouldCompress) {
      bodyData = await gzip(Buffer.from(jsonData, 'utf-8'));
    } else {
      bodyData = Buffer.from(jsonData, 'utf-8');
    }

    const checksum = crypto.createHash('md5').update(bodyData).digest('hex');

    try {
      await this.client!.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: bodyData,
          ContentType: shouldCompress ? 'application/gzip' : 'application/json',
          ContentEncoding: shouldCompress ? 'gzip' : undefined,
          Metadata: {
            executionId,
            nodeId,
            dataType,
            originalSize: jsonData.length.toString(),
            compressed: shouldCompress.toString(),
          },
        }),
      );

      this.logger.debug(
        `Stored ${dataType} data for node ${nodeId} (${bodyData.length} bytes, compressed: ${shouldCompress})`,
      );

      return {
        bucket: this.bucket,
        key,
        size: bodyData.length,
        compressed: shouldCompress,
        checksum,
        storedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to store ${dataType} data for node ${nodeId}:`, error);
      return null;
    }
  }

  /**
   * Retrieve execution log data from object storage
   */
  async getExecutionLogData(
    reference: StoredDataReference,
  ): Promise<unknown | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      const response = await this.client!.send(
        new GetObjectCommand({
          Bucket: reference.bucket,
          Key: reference.key,
        }),
      );

      const bodyStream = response.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of bodyStream) {
        chunks.push(Buffer.from(chunk));
      }

      let data = Buffer.concat(chunks);

      if (reference.compressed) {
        data = await gunzip(data);
      }

      return JSON.parse(data.toString('utf-8'));
    } catch (error) {
      this.logger.error(`Failed to retrieve data from ${reference.key}:`, error);
      return null;
    }
  }

  /**
   * Delete execution log data from object storage
   */
  async deleteExecutionLogData(reference: StoredDataReference): Promise<boolean> {
    if (!this.isEnabled()) {
      return false;
    }

    try {
      await this.client!.send(
        new DeleteObjectCommand({
          Bucket: reference.bucket,
          Key: reference.key,
        }),
      );

      this.logger.debug(`Deleted data: ${reference.key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete ${reference.key}:`, error);
      return false;
    }
  }

  /**
   * Delete all execution log data for an execution
   */
  async deleteExecutionData(executionId: string): Promise<number> {
    if (!this.isEnabled()) {
      return 0;
    }

    const prefix = `executions/${executionId}/`;

    try {
      // List all objects with the execution prefix
      const listResponse = await this.client!.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
        }),
      );

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return 0;
      }

      // Delete all objects
      await this.client!.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: listResponse.Contents.map((obj) => ({ Key: obj.Key })),
          },
        }),
      );

      this.logger.log(`Deleted ${listResponse.Contents.length} objects for execution ${executionId}`);
      return listResponse.Contents.length;
    } catch (error) {
      this.logger.error(`Failed to delete execution data for ${executionId}:`, error);
      return 0;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    enabled: boolean;
    bucket: string;
    objectCount?: number;
    totalSize?: number;
  }> {
    if (!this.isEnabled()) {
      return { enabled: false, bucket: this.bucket };
    }

    try {
      let objectCount = 0;
      let totalSize = 0;
      let continuationToken: string | undefined;

      do {
        const response = await this.client!.send(
          new ListObjectsV2Command({
            Bucket: this.bucket,
            ContinuationToken: continuationToken,
          }),
        );

        if (response.Contents) {
          objectCount += response.Contents.length;
          totalSize += response.Contents.reduce((sum, obj) => sum + (obj.Size || 0), 0);
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return {
        enabled: true,
        bucket: this.bucket,
        objectCount,
        totalSize,
      };
    } catch (error) {
      this.logger.error('Failed to get storage stats:', error);
      return { enabled: true, bucket: this.bucket };
    }
  }

  /**
   * Build object key for execution log data
   */
  private buildKey(executionId: string, nodeId: string, dataType: string): string {
    // Format: executions/{executionId}/nodes/{nodeId}/{dataType}.json
    return `executions/${executionId}/nodes/${nodeId}/${dataType}.json`;
  }

  /**
   * Ensure the bucket exists, create if needed
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      await this.client!.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        this.logger.log(`Creating bucket: ${this.bucket}`);
        await this.client!.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } else {
        throw error;
      }
    }
  }
}
