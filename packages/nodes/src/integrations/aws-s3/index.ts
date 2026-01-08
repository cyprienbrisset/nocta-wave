import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AwsS3Schema = z.object({
  operation: z.enum(['upload', 'download', 'delete', 'list', 'getSignedUrl']).default('list'),
  bucket: z.string(),
  key: z.string().optional(),
  prefix: z.string().optional(),
  content: z.string().optional(),
  contentType: z.string().optional(),
  expiresIn: z.number().default(3600),
});

export const awsS3Node: NodeDefinition = createNode(
  {
    type: 'integration.aws-s3',
    category: 'integration',
    name: 'AWS S3',
    description: 'Upload, download, and manage files in S3',
    icon: 'Cloud',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Upload File', value: 'upload' },
        { label: 'Download File', value: 'download' },
        { label: 'Delete File', value: 'delete' },
        { label: 'List Files', value: 'list' },
        { label: 'Get Signed URL', value: 'getSignedUrl' },
      ], { default: 'list' }),
      input.string('bucket', 'Bucket', { required: true }),
      input.string('key', 'Key', { description: 'File key/path' }),
      input.string('prefix', 'Prefix', { description: 'List prefix filter' }),
      input.string('content', 'Content', { description: 'File content (for upload)' }),
      input.string('contentType', 'Content Type', { default: 'application/octet-stream' }),
      input.number('expiresIn', 'Expires In', { default: 3600, description: 'Signed URL expiry (seconds)' }),
    ],
    outputs: [output.main({ description: 'S3 operation result' })],
    credentials: ['custom'],
  },
  async (nodeInput, context) => {
    const config = AwsS3Schema.parse(nodeInput.config);
    context.logger.info(`AWS S3: ${config.operation}`);
    return { data: { result: {}, files: [], __needsExecution: true } };
  }
);
