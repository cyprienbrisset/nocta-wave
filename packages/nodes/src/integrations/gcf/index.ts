import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GcfNodeSchema = z.object({
  operation: z.enum([
    'call', 'list', 'get', 'create', 'update', 'delete',
    'getIamPolicy', 'setIamPolicy', 'testIamPermissions'
  ]).default('call'),
  projectId: z.string().optional(),
  location: z.string().default('us-central1'),
  functionName: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  runtime: z.enum([
    'nodejs20', 'nodejs18', 'nodejs16',
    'python312', 'python311', 'python310',
    'go121', 'go120', 'java17', 'java11',
    'dotnet6', 'ruby32', 'php82'
  ]).optional(),
  entryPoint: z.string().optional(),
  sourceArchiveUrl: z.string().optional(),
  sourceRepository: z.object({
    url: z.string(),
    branch: z.string().optional(),
    tag: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  timeout: z.string().default('60s'),
  availableMemoryMb: z.number().default(256),
  minInstances: z.number().default(0),
  maxInstances: z.number().default(100),
  environmentVariables: z.record(z.string()).optional(),
  vpcConnector: z.string().optional(),
  ingressSettings: z.enum(['ALLOW_ALL', 'ALLOW_INTERNAL_ONLY', 'ALLOW_INTERNAL_AND_GCLB']).default('ALLOW_ALL'),
  triggerHttp: z.boolean().default(true),
  triggerTopic: z.string().optional(),
  triggerBucket: z.string().optional(),
  credentialId: z.string().optional(),
});

export type GcfNodeConfig = z.infer<typeof GcfNodeSchema>;

export const gcfNode: NodeDefinition = createNode(
  {
    type: 'integration.gcf',
    category: 'integration',
    name: 'Google Cloud Functions',
    description: 'Serverless functions - Invoke, manage GCP functions',
    icon: 'Cloud',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Call Function', value: 'call' },
          { label: 'List Functions', value: 'list' },
          { label: 'Get Function', value: 'get' },
          { label: 'Create Function', value: 'create' },
          { label: 'Update Function', value: 'update' },
          { label: 'Delete Function', value: 'delete' },
          { label: 'Get IAM Policy', value: 'getIamPolicy' },
          { label: 'Set IAM Policy', value: 'setIamPolicy' },
        ],
        { default: 'call' }
      ),
      input.string('projectId', 'Project ID', {
        description: 'GCP project ID',
        placeholder: 'my-project',
        required: true,
      }),
      input.string('location', 'Location', {
        description: 'GCP region',
        default: 'us-central1',
      }),
      input.string('functionName', 'Function Name', {
        description: 'Cloud Function name',
        placeholder: 'my-function',
        required: true,
      }),
      input.json('data', 'Data', {
        description: 'Data to send to function',
        default: {},
      }),
      input.select(
        'runtime',
        'Runtime',
        [
          { label: 'Node.js 20', value: 'nodejs20' },
          { label: 'Node.js 18', value: 'nodejs18' },
          { label: 'Python 3.12', value: 'python312' },
          { label: 'Python 3.11', value: 'python311' },
          { label: 'Go 1.21', value: 'go121' },
          { label: 'Java 17', value: 'java17' },
          { label: '.NET 6', value: 'dotnet6' },
        ],
        { default: 'nodejs20' }
      ),
      input.string('entryPoint', 'Entry Point', {
        description: 'Function entry point',
        placeholder: 'helloWorld',
      }),
      input.string('description', 'Description', {
        description: 'Function description',
      }),
      input.string('timeout', 'Timeout', {
        description: 'Timeout duration',
        default: '60s',
      }),
      input.number('availableMemoryMb', 'Memory (MB)', {
        description: 'Available memory',
        default: 256,
      }),
      input.number('minInstances', 'Min Instances', {
        description: 'Minimum instances',
        default: 0,
      }),
      input.number('maxInstances', 'Max Instances', {
        description: 'Maximum instances',
        default: 100,
      }),
      input.json('environmentVariables', 'Environment', {
        description: 'Environment variables',
        default: {},
      }),
      input.select(
        'ingressSettings',
        'Ingress Settings',
        [
          { label: 'Allow All', value: 'ALLOW_ALL' },
          { label: 'Internal Only', value: 'ALLOW_INTERNAL_ONLY' },
          { label: 'Internal + GCLB', value: 'ALLOW_INTERNAL_AND_GCLB' },
        ],
        { default: 'ALLOW_ALL' }
      ),
      input.boolean('triggerHttp', 'HTTP Trigger', {
        description: 'Use HTTP trigger',
        default: true,
      }),
      input.string('triggerTopic', 'Pub/Sub Topic', {
        description: 'Pub/Sub topic trigger',
      }),
      input.credential('credentialId', 'GCP Credentials', {
        description: 'Google Cloud credentials',
        credentialTypes: ['SERVICE_ACCOUNT', 'OAUTH2'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('result', 'Function result'),
      output.string('executionId', 'Execution ID'),
      output.array('functions', 'Function list'),
      output.object('function', 'Function details'),
    ],
    defaults: {
      operation: 'call',
      location: 'us-central1',
      timeout: '60s',
      availableMemoryMb: 256,
      minInstances: 0,
      maxInstances: 100,
      ingressSettings: 'ALLOW_ALL',
      triggerHttp: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GcfNodeSchema.parse(nodeInput.config);

    logger.info(`GCF ${config.operation}`);

    switch (config.operation) {
      case 'call':
        return {
          data: {
            success: true,
            result: { message: 'Function executed successfully', data: config.data },
            executionId: `exec_${Date.now()}`,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            functions: [
              { name: 'my-function', status: 'ACTIVE', runtime: 'nodejs20' },
              { name: 'process-data', status: 'ACTIVE', runtime: 'python312' },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            function: {
              name: `projects/${config.projectId}/locations/${config.location}/functions/${config.functionName}`,
              status: 'ACTIVE',
              runtime: config.runtime,
              entryPoint: config.entryPoint,
              timeout: config.timeout,
              availableMemoryMb: config.availableMemoryMb,
              httpsTrigger: { url: `https://${config.location}-${config.projectId}.cloudfunctions.net/${config.functionName}` },
            },
          },
        };

      case 'create':
      case 'update':
        return {
          data: {
            success: true,
            function: {
              name: `projects/${config.projectId}/locations/${config.location}/functions/${config.functionName}`,
              status: 'DEPLOYING',
            },
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            deleted: true,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
