import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const FileWatchTriggerSchema = z.object({
  storageType: z.enum(['local', 's3', 'sftp', 'gcs']).default('local'),
  path: z.string().min(1),
  pattern: z.string().optional(),
  events: z.array(z.enum(['create', 'modify', 'delete', 'move'])).default(['create', 'modify']),
  recursive: z.boolean().default(false),
  pollingInterval: z.number().min(1000).default(5000),
  credentialId: z.string().optional(),
});

export type FileWatchTriggerConfig = z.infer<typeof FileWatchTriggerSchema>;

export const fileWatchTrigger: NodeDefinition = createNode(
  {
    type: 'trigger.file-watch',
    category: 'trigger',
    name: 'File Watcher',
    description: 'Trigger workflow when files change (local/S3/SFTP/GCS)',
    icon: 'FileSearch',
    inputs: [
      input.select(
        'storageType',
        'Storage Type',
        [
          { label: 'Local Filesystem', value: 'local' },
          { label: 'AWS S3', value: 's3' },
          { label: 'SFTP', value: 'sftp' },
          { label: 'Google Cloud Storage', value: 'gcs' },
        ],
        { default: 'local' }
      ),
      input.string('path', 'Watch Path', {
        description: 'Path or bucket to watch for changes',
        placeholder: '/data/uploads or s3://bucket/prefix',
        required: true,
      }),
      input.string('pattern', 'File Pattern', {
        description: 'Glob pattern to filter files (e.g., *.csv, **/*.json)',
        placeholder: '*.csv',
      }),
      input.multiSelect(
        'events',
        'Watch Events',
        [
          { label: 'Created', value: 'create' },
          { label: 'Modified', value: 'modify' },
          { label: 'Deleted', value: 'delete' },
          { label: 'Moved', value: 'move' },
        ],
        { default: ['create', 'modify'] }
      ),
      input.boolean('recursive', 'Recursive', {
        description: 'Watch subdirectories recursively',
        default: false,
      }),
      input.number('pollingInterval', 'Polling Interval (ms)', {
        description: 'How often to check for changes (for remote storage)',
        default: 5000,
        min: 1000,
        max: 3600000,
      }),
      input.credential('credentialId', 'Credentials', {
        description: 'Credentials for remote storage access',
        credentialTypes: ['AWS', 'BASIC_AUTH', 'API_KEY'],
      }),
    ],
    outputs: [
      output.string('event', 'Event type (create/modify/delete/move)'),
      output.string('path', 'File path'),
      output.string('filename', 'File name'),
      output.number('size', 'File size in bytes'),
      output.string('mimeType', 'MIME type'),
      output.string('modifiedAt', 'Last modified timestamp'),
      output.object('metadata', 'File metadata'),
    ],
    defaults: {
      storageType: 'local',
      path: '',
      pattern: '',
      events: ['create', 'modify'],
      recursive: false,
      pollingInterval: 5000,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = FileWatchTriggerSchema.parse(nodeInput.config);
    const data = nodeInput.data as Record<string, unknown>;

    logger.info(`File watch trigger activated: ${config.storageType}:${config.path}`);

    const filename = typeof data.path === 'string'
      ? data.path.split('/').pop() || ''
      : '';

    return {
      data: {
        event: data.event || 'create',
        path: data.path || config.path,
        filename,
        size: data.size || 0,
        mimeType: data.mimeType || 'application/octet-stream',
        modifiedAt: data.modifiedAt || new Date().toISOString(),
        metadata: {
          storageType: config.storageType,
          pattern: config.pattern,
          recursive: config.recursive,
          ...(data.metadata as object || {}),
        },
        triggerType: 'file-watch',
        triggeredAt: new Date().toISOString(),
      },
    };
  }
);
