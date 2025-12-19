import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../database/redis.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Readable, Transform, PassThrough } from 'stream';

interface StreamOptions {
  batchSize?: number;
  highWaterMark?: number;
  transform?: (chunk: any) => any;
}

export interface StreamProgress {
  totalItems: number;
  processedItems: number;
  currentBatch: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly activeStreams = new Map<string, StreamProgress>();

  constructor(
    private redis: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a readable stream from an array with batching
   */
  createBatchStream<T>(
    data: T[],
    options: StreamOptions = {},
  ): Readable {
    const batchSize = options.batchSize || 100;
    const highWaterMark = options.highWaterMark || 16;
    let index = 0;

    return new Readable({
      objectMode: true,
      highWaterMark,
      read() {
        if (index >= data.length) {
          this.push(null);
          return;
        }

        const batch = data.slice(index, index + batchSize);
        index += batchSize;

        const transformedBatch = options.transform
          ? batch.map(options.transform)
          : batch;

        this.push(transformedBatch);
      },
    });
  }

  /**
   * Create a transform stream for processing batches
   */
  createBatchProcessor<T, R>(
    processor: (batch: T[]) => Promise<R[]>,
  ): Transform {
    return new Transform({
      objectMode: true,
      async transform(batch: T[], encoding, callback) {
        try {
          const results = await processor(batch);
          this.push(results);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }

  /**
   * Stream large dataset from Redis list
   */
  async *streamFromRedis<T>(
    key: string,
    batchSize: number = 100,
  ): AsyncGenerator<T[], void, unknown> {
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await this.redis.lrange(key, start, start + batchSize - 1);

      if (batch.length === 0) {
        hasMore = false;
      } else {
        yield batch.map((item: string) => JSON.parse(item)) as T[];
        start += batchSize;

        if (batch.length < batchSize) {
          hasMore = false;
        }
      }
    }
  }

  /**
   * Process items through a pipeline with progress tracking
   */
  async processWithProgress<T, R>(
    streamId: string,
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      onProgress?: (progress: StreamProgress) => void;
    } = {},
  ): Promise<R[]> {
    const concurrency = options.concurrency || 5;
    const results: R[] = [];
    let processedItems = 0;

    // Initialize progress
    const progress: StreamProgress = {
      totalItems: items.length,
      processedItems: 0,
      currentBatch: 0,
      status: 'processing',
    };
    this.activeStreams.set(streamId, progress);

    try {
      // Process in batches with concurrency control
      for (let i = 0; i < items.length; i += concurrency) {
        const batch = items.slice(i, i + concurrency);
        progress.currentBatch = Math.floor(i / concurrency) + 1;

        const batchResults = await Promise.all(
          batch.map(async (item) => {
            const result = await processor(item);
            processedItems++;
            progress.processedItems = processedItems;

            // Emit progress update
            this.eventEmitter.emit('stream.progress', {
              streamId,
              progress: { ...progress },
            });

            if (options.onProgress) {
              options.onProgress({ ...progress });
            }

            return result;
          }),
        );

        results.push(...batchResults);

        // Publish progress to Redis for distributed monitoring
        await this.redis.set(
          `stream:progress:${streamId}`,
          progress,
          3600,
        );
      }

      progress.status = 'completed';
      this.activeStreams.set(streamId, progress);

      return results;
    } catch (error) {
      progress.status = 'error';
      progress.error = (error as Error).message;
      this.activeStreams.set(streamId, progress);
      throw error;
    }
  }

  /**
   * Create a Server-Sent Events stream for real-time updates
   */
  createSSEStream(streamId: string): PassThrough {
    const stream = new PassThrough();

    // Subscribe to progress updates
    const listener = (data: { streamId: string; progress: StreamProgress }) => {
      if (data.streamId === streamId) {
        stream.write(`data: ${JSON.stringify(data.progress)}\n\n`);

        if (data.progress.status === 'completed' || data.progress.status === 'error') {
          stream.end();
          this.eventEmitter.off('stream.progress', listener);
        }
      }
    };

    this.eventEmitter.on('stream.progress', listener);

    // Cleanup on stream close
    stream.on('close', () => {
      this.eventEmitter.off('stream.progress', listener);
    });

    return stream;
  }

  /**
   * Get current progress of a stream
   */
  getProgress(streamId: string): StreamProgress | null {
    return this.activeStreams.get(streamId) || null;
  }

  /**
   * Stream workflow execution logs in real-time
   */
  async *streamExecutionLogs(
    executionId: string,
  ): AsyncGenerator<any, void, unknown> {
    const channel = `execution:${executionId}:logs`;

    // Create a promise-based queue for Redis pub/sub messages
    const messageQueue: any[] = [];
    let resolver: (() => void) | null = null;
    let isComplete = false;

    // Subscribe to execution logs
    const subscriber = this.redis.duplicate();
    await subscriber.subscribe(channel);

    subscriber.on('message', (ch: string, message: string) => {
      if (ch === channel) {
        const data = JSON.parse(message);
        messageQueue.push(data);

        if (data.type === 'complete' || data.type === 'error') {
          isComplete = true;
        }

        if (resolver) {
          resolver();
          resolver = null;
        }
      }
    });

    try {
      while (!isComplete || messageQueue.length > 0) {
        if (messageQueue.length > 0) {
          yield messageQueue.shift();
        } else {
          // Wait for next message
          await new Promise<void>((resolve) => {
            resolver = resolve;
          });
        }
      }
    } finally {
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    }
  }

  /**
   * Publish execution log for streaming
   */
  async publishExecutionLog(
    executionId: string,
    log: {
      type: 'node_start' | 'node_complete' | 'node_error' | 'complete' | 'error';
      nodeId?: string;
      nodeName?: string;
      data?: any;
      error?: string;
      timestamp?: Date;
    },
  ): Promise<void> {
    const channel = `execution:${executionId}:logs`;
    await this.redis.publish(
      channel,
      JSON.stringify({
        ...log,
        timestamp: log.timestamp || new Date(),
      }),
    );
  }

  /**
   * Chunk large data for streaming
   */
  chunkData<T>(data: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < data.length; i += chunkSize) {
      chunks.push(data.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
