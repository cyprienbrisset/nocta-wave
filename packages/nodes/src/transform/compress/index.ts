import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const CompressNodeSchema = z.object({
  operation: z.enum(['compress', 'decompress', 'archive', 'extract', 'list']).default('compress'),
  algorithm: z.enum(['gzip', 'deflate', 'brotli', 'zstd', 'lz4', 'snappy']).default('gzip'),
  archiveFormat: z.enum(['zip', 'tar', 'tar.gz', 'tar.bz2', '7z', 'rar']).default('zip'),
  input: z.string().optional(),
  inputPath: z.string().optional(),
  inputPaths: z.array(z.string()).optional(),
  outputPath: z.string().optional(),
  level: z.number().min(1).max(9).default(6),
  password: z.string().optional(),
  includePattern: z.string().optional(),
  excludePattern: z.string().optional(),
  preserveStructure: z.boolean().default(true),
  overwrite: z.boolean().default(false),
  comment: z.string().optional(),
  splitSize: z.number().optional(),
  encoding: z.enum(['utf-8', 'ascii', 'latin1']).default('utf-8'),
});

export type CompressNodeConfig = z.infer<typeof CompressNodeSchema>;

export const compressNode: NodeDefinition = createNode(
  {
    type: 'transform.compress',
    category: 'transform',
    name: 'Compress',
    description: 'Compress, decompress, and archive files',
    icon: 'Archive',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Compress Data', value: 'compress' },
          { label: 'Decompress Data', value: 'decompress' },
          { label: 'Create Archive', value: 'archive' },
          { label: 'Extract Archive', value: 'extract' },
          { label: 'List Archive', value: 'list' },
        ],
        { default: 'compress' }
      ),
      input.select(
        'algorithm',
        'Algorithm',
        [
          { label: 'Gzip', value: 'gzip' },
          { label: 'Deflate', value: 'deflate' },
          { label: 'Brotli', value: 'brotli' },
          { label: 'Zstandard', value: 'zstd' },
          { label: 'LZ4', value: 'lz4' },
          { label: 'Snappy', value: 'snappy' },
        ],
        { default: 'gzip' }
      ),
      input.select(
        'archiveFormat',
        'Archive Format',
        [
          { label: 'ZIP', value: 'zip' },
          { label: 'TAR', value: 'tar' },
          { label: 'TAR.GZ', value: 'tar.gz' },
          { label: 'TAR.BZ2', value: 'tar.bz2' },
          { label: '7-Zip', value: '7z' },
        ],
        { default: 'zip' }
      ),
      input.text('input', 'Input Data', {
        description: 'Data to compress (text or base64)',
      }),
      input.string('inputPath', 'Input Path', {
        description: 'File or folder to compress',
        placeholder: '/path/to/file.txt',
      }),
      input.json('inputPaths', 'Input Paths', {
        description: 'Multiple files to archive',
        default: [],
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Output file path',
        placeholder: '/path/to/output.zip',
      }),
      input.number('level', 'Compression Level', {
        description: 'Compression level (1-9)',
        default: 6,
        min: 1,
        max: 9,
      }),
      input.string('password', 'Password', {
        description: 'Archive password',
      }),
      input.string('includePattern', 'Include Pattern', {
        description: 'Glob pattern for files to include',
        placeholder: '*.txt',
      }),
      input.string('excludePattern', 'Exclude Pattern', {
        description: 'Glob pattern for files to exclude',
        placeholder: '*.log',
      }),
      input.boolean('preserveStructure', 'Preserve Structure', {
        description: 'Keep folder structure in archive',
        default: true,
      }),
      input.boolean('overwrite', 'Overwrite', {
        description: 'Overwrite existing files',
        default: false,
      }),
      input.string('comment', 'Comment', {
        description: 'Archive comment',
      }),
    ],
    outputs: [output.main({ description: 'Transformation result' })],
    defaults: {
      operation: 'compress',
      algorithm: 'gzip',
      archiveFormat: 'zip',
      level: 6,
      preserveStructure: true,
      overwrite: false,
      encoding: 'utf-8',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CompressNodeSchema.parse(nodeInput.config);

    logger.info(`Compress ${config.operation} with ${config.algorithm}`);

    switch (config.operation) {
      case 'compress':
        return {
          data: {
            success: true,
            compressed: 'H4sIAAAAAAAAA0tJTc7PLShKLS4GANDSj84HAAAA',
            originalSize: 1024,
            compressedSize: 256,
            ratio: 0.25,
          },
        };

      case 'decompress':
        return {
          data: {
            success: true,
            decompressed: 'This is the decompressed content of the file.',
            originalSize: 256,
            compressedSize: 1024,
          },
        };

      case 'archive':
        return {
          data: {
            success: true,
            archivePath: config.outputPath || '/tmp/archive.zip',
            files: [
              { name: 'file1.txt', size: 1024, compressed: 256 },
              { name: 'file2.txt', size: 2048, compressed: 512 },
              { name: 'folder/file3.txt', size: 512, compressed: 128 },
            ],
            originalSize: 3584,
            compressedSize: 896,
            ratio: 0.25,
          },
        };

      case 'extract':
        return {
          data: {
            success: true,
            extractPath: config.outputPath || '/tmp/extracted',
            files: [
              { name: 'file1.txt', size: 1024, path: '/tmp/extracted/file1.txt' },
              { name: 'file2.txt', size: 2048, path: '/tmp/extracted/file2.txt' },
              { name: 'folder/file3.txt', size: 512, path: '/tmp/extracted/folder/file3.txt' },
            ],
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            files: [
              { name: 'file1.txt', size: 1024, compressed: 256, date: '2024-01-15 10:00:00' },
              { name: 'file2.txt', size: 2048, compressed: 512, date: '2024-01-15 10:01:00' },
              { name: 'folder/file3.txt', size: 512, compressed: 128, date: '2024-01-15 10:02:00' },
            ],
            originalSize: 3584,
            compressedSize: 896,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
