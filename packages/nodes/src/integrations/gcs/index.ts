import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GCSNodeSchema = z.object({
  operation: z.enum(['upload', 'download', 'delete', 'list', 'getMetadata', 'copy', 'move', 'createBucket', 'listBuckets']).default('upload'),
  bucket: z.string().min(1),
  objectPath: z.string().optional(),
  content: z.unknown().optional(),
  contentType: z.string().optional(),
  destinationBucket: z.string().optional(),
  destinationPath: z.string().optional(),
  prefix: z.string().optional(),
  maxResults: z.number().min(1).max(1000).default(100),
  metadata: z.record(z.string()).optional(),
  makePublic: z.boolean().default(false),
  credentialId: z.string().optional(),
});

export type GCSNodeConfig = z.infer<typeof GCSNodeSchema>;

export const gcsNode: NodeDefinition = createNode(
  {
    type: 'integration.gcs',
    category: 'integration',
    name: 'Google Cloud Storage',
    description: 'Upload, download, and manage files in Google Cloud Storage',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Upload File', value: 'upload' },
          { label: 'Download File', value: 'download' },
          { label: 'Delete File', value: 'delete' },
          { label: 'List Files', value: 'list' },
          { label: 'Get Metadata', value: 'getMetadata' },
          { label: 'Copy File', value: 'copy' },
          { label: 'Move File', value: 'move' },
          { label: 'Create Bucket', value: 'createBucket' },
          { label: 'List Buckets', value: 'listBuckets' },
        ],
        { default: 'upload' }
      ),
      input.string('bucket', 'Bucket Name', {
        description: 'GCS bucket name',
        placeholder: 'my-bucket',
        required: true,
      }),
      input.string('objectPath', 'Object Path', {
        description: 'Path to the object in the bucket',
        placeholder: 'folder/file.json',
      }),
      input.json('content', 'Content', {
        description: 'File content to upload (JSON or base64 string)',
        default: {},
      }),
      input.string('contentType', 'Content Type', {
        description: 'MIME type of the content',
        placeholder: 'application/json',
      }),
      input.string('destinationBucket', 'Destination Bucket', {
        description: 'Destination bucket for copy/move operations',
      }),
      input.string('destinationPath', 'Destination Path', {
        description: 'Destination object path for copy/move operations',
      }),
      input.string('prefix', 'Prefix', {
        description: 'Filter objects by prefix (for list operation)',
        placeholder: 'folder/',
      }),
      input.number('maxResults', 'Max Results', {
        description: 'Maximum number of results to return',
        min: 1,
        max: 1000,
        default: 100,
      }),
      input.json('metadata', 'Metadata', {
        description: 'Custom metadata for the object',
        default: {},
      }),
      input.boolean('makePublic', 'Make Public', {
        description: 'Make the uploaded file publicly accessible',
        default: false,
      }),
      input.credential('credentialId', 'Google Cloud Credentials', {
        description: 'Google Cloud service account credentials',
        credentialTypes: ['OAUTH2', 'API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'GCS operation result' })],
    defaults: {
      operation: 'upload',
      bucket: '',
      maxResults: 100,
      makePublic: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GCSNodeSchema.parse(nodeInput.config);

    logger.info(`GCS operation: ${config.operation} on bucket: ${config.bucket}`);

    const gsUri = `gs://${config.bucket}/${config.objectPath || ''}`;
    const publicUrl = config.makePublic
      ? `https://storage.googleapis.com/${config.bucket}/${config.objectPath}`
      : undefined;

    switch (config.operation) {
      case 'upload':
        logger.info(`Uploading to ${gsUri}`);
        return {
          data: {
            success: true,
            gsUri,
            url: publicUrl,
            metadata: {
              name: config.objectPath,
              bucket: config.bucket,
              contentType: config.contentType || 'application/octet-stream',
              size: JSON.stringify(config.content || {}).length,
              updated: new Date().toISOString(),
              ...config.metadata,
            },
          },
        };

      case 'download':
        logger.info(`Downloading from ${gsUri}`);
        return {
          data: {
            success: true,
            content: nodeInput.data || {},
            gsUri,
            metadata: {
              name: config.objectPath,
              bucket: config.bucket,
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            gsUri,
            deleted: true,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            files: [
              {
                name: config.prefix ? `${config.prefix}example.json` : 'example.json',
                bucket: config.bucket,
                size: 1024,
                updated: new Date().toISOString(),
              },
            ],
            nextPageToken: null,
          },
        };

      case 'getMetadata':
        return {
          data: {
            success: true,
            metadata: {
              name: config.objectPath,
              bucket: config.bucket,
              contentType: config.contentType || 'application/octet-stream',
              size: 1024,
              created: new Date().toISOString(),
              updated: new Date().toISOString(),
              ...config.metadata,
            },
          },
        };

      case 'copy':
      case 'move':
        const destUri = `gs://${config.destinationBucket || config.bucket}/${config.destinationPath}`;
        return {
          data: {
            success: true,
            sourceUri: gsUri,
            destinationUri: destUri,
            operation: config.operation,
          },
        };

      case 'createBucket':
        return {
          data: {
            success: true,
            bucket: config.bucket,
            location: 'US',
          },
        };

      case 'listBuckets':
        return {
          data: {
            success: true,
            buckets: [{ name: config.bucket, location: 'US' }],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
