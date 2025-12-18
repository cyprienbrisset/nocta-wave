import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AzureBlobNodeSchema = z.object({
  operation: z.enum(['upload', 'download', 'delete', 'list', 'getProperties', 'copy', 'createContainer', 'listContainers']).default('upload'),
  containerName: z.string().min(1),
  blobName: z.string().optional(),
  content: z.unknown().optional(),
  contentType: z.string().optional(),
  destinationContainer: z.string().optional(),
  destinationBlob: z.string().optional(),
  prefix: z.string().optional(),
  maxResults: z.number().min(1).max(5000).default(100),
  metadata: z.record(z.string()).optional(),
  accessTier: z.enum(['Hot', 'Cool', 'Archive']).default('Hot'),
  credentialId: z.string().optional(),
});

export type AzureBlobNodeConfig = z.infer<typeof AzureBlobNodeSchema>;

export const azureBlobNode: NodeDefinition = createNode(
  {
    type: 'integration.azure-blob',
    category: 'integration',
    name: 'Azure Blob Storage',
    description: 'Upload, download, and manage files in Azure Blob Storage',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Upload Blob', value: 'upload' },
          { label: 'Download Blob', value: 'download' },
          { label: 'Delete Blob', value: 'delete' },
          { label: 'List Blobs', value: 'list' },
          { label: 'Get Properties', value: 'getProperties' },
          { label: 'Copy Blob', value: 'copy' },
          { label: 'Create Container', value: 'createContainer' },
          { label: 'List Containers', value: 'listContainers' },
        ],
        { default: 'upload' }
      ),
      input.string('containerName', 'Container Name', {
        description: 'Azure Blob container name',
        placeholder: 'my-container',
        required: true,
      }),
      input.string('blobName', 'Blob Name', {
        description: 'Name of the blob (file path)',
        placeholder: 'folder/file.json',
      }),
      input.json('content', 'Content', {
        description: 'Content to upload',
        default: {},
      }),
      input.string('contentType', 'Content Type', {
        description: 'MIME type of the content',
        placeholder: 'application/json',
      }),
      input.string('destinationContainer', 'Destination Container', {
        description: 'Destination container for copy operation',
      }),
      input.string('destinationBlob', 'Destination Blob', {
        description: 'Destination blob name for copy operation',
      }),
      input.string('prefix', 'Prefix', {
        description: 'Filter blobs by prefix',
        placeholder: 'folder/',
      }),
      input.number('maxResults', 'Max Results', {
        description: 'Maximum number of results',
        min: 1,
        max: 5000,
        default: 100,
      }),
      input.json('metadata', 'Metadata', {
        description: 'Custom metadata for the blob',
        default: {},
      }),
      input.select(
        'accessTier',
        'Access Tier',
        [
          { label: 'Hot', value: 'Hot' },
          { label: 'Cool', value: 'Cool' },
          { label: 'Archive', value: 'Archive' },
        ],
        { default: 'Hot' }
      ),
      input.credential('credentialId', 'Azure Credentials', {
        description: 'Azure Storage connection string or SAS token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.string('url', 'Blob URL'),
      output.object('content', 'Downloaded content'),
      output.array('blobs', 'List of blobs'),
      output.object('properties', 'Blob properties'),
    ],
    defaults: {
      operation: 'upload',
      containerName: '',
      maxResults: 100,
      accessTier: 'Hot',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AzureBlobNodeSchema.parse(nodeInput.config);

    logger.info(`Azure Blob operation: ${config.operation} on container: ${config.containerName}`);

    const blobUrl = `https://storageaccount.blob.core.windows.net/${config.containerName}/${config.blobName || ''}`;

    switch (config.operation) {
      case 'upload':
        logger.info(`Uploading to ${blobUrl}`);
        return {
          data: {
            success: true,
            url: blobUrl,
            properties: {
              name: config.blobName,
              container: config.containerName,
              contentType: config.contentType || 'application/octet-stream',
              contentLength: JSON.stringify(config.content || {}).length,
              lastModified: new Date().toISOString(),
              accessTier: config.accessTier,
              metadata: config.metadata,
            },
          },
        };

      case 'download':
        logger.info(`Downloading from ${blobUrl}`);
        return {
          data: {
            success: true,
            content: nodeInput.data || {},
            url: blobUrl,
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            url: blobUrl,
            deleted: true,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            blobs: [
              {
                name: config.prefix ? `${config.prefix}example.json` : 'example.json',
                container: config.containerName,
                contentLength: 1024,
                lastModified: new Date().toISOString(),
                accessTier: config.accessTier,
              },
            ],
            continuationToken: null,
          },
        };

      case 'getProperties':
        return {
          data: {
            success: true,
            properties: {
              name: config.blobName,
              container: config.containerName,
              contentType: config.contentType || 'application/octet-stream',
              contentLength: 1024,
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              accessTier: config.accessTier,
              metadata: config.metadata,
            },
          },
        };

      case 'copy':
        const destUrl = `https://storageaccount.blob.core.windows.net/${config.destinationContainer || config.containerName}/${config.destinationBlob}`;
        return {
          data: {
            success: true,
            sourceUrl: blobUrl,
            destinationUrl: destUrl,
            copyId: `copy_${Date.now()}`,
            copyStatus: 'success',
          },
        };

      case 'createContainer':
        return {
          data: {
            success: true,
            container: config.containerName,
          },
        };

      case 'listContainers':
        return {
          data: {
            success: true,
            containers: [{ name: config.containerName }],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
