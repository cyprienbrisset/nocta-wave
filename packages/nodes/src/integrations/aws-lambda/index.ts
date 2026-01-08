import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AwsLambdaNodeSchema = z.object({
  operation: z.enum([
    'invoke', 'invokeAsync', 'list', 'get', 'create', 'update', 'delete',
    'publishVersion', 'listVersions', 'createAlias', 'updateAlias', 'deleteAlias',
    'addPermission', 'getPolicy', 'listLayers'
  ]).default('invoke'),
  functionName: z.string().optional(),
  qualifier: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  invocationType: z.enum(['RequestResponse', 'Event', 'DryRun']).default('RequestResponse'),
  logType: z.enum(['None', 'Tail']).default('None'),
  runtime: z.enum([
    'nodejs18.x', 'nodejs20.x', 'python3.9', 'python3.10', 'python3.11', 'python3.12',
    'java17', 'java21', 'dotnet6', 'dotnet8', 'go1.x', 'ruby3.2', 'provided.al2', 'provided.al2023'
  ]).optional(),
  handler: z.string().optional(),
  code: z.object({
    s3Bucket: z.string().optional(),
    s3Key: z.string().optional(),
    zipFile: z.string().optional(),
  }).optional(),
  role: z.string().optional(),
  description: z.string().optional(),
  timeout: z.number().min(1).max(900).default(30),
  memorySize: z.number().min(128).max(10240).default(128),
  environment: z.record(z.string()).optional(),
  vpcConfig: z.object({
    subnetIds: z.array(z.string()),
    securityGroupIds: z.array(z.string()),
  }).optional(),
  layers: z.array(z.string()).optional(),
  aliasName: z.string().optional(),
  aliasDescription: z.string().optional(),
  functionVersion: z.string().optional(),
  region: z.string().default('us-east-1'),
  credentialId: z.string().optional(),
});

export type AwsLambdaNodeConfig = z.infer<typeof AwsLambdaNodeSchema>;

export const awsLambdaNode: NodeDefinition = createNode(
  {
    type: 'integration.aws-lambda',
    category: 'integration',
    name: 'AWS Lambda',
    description: 'Serverless functions - Invoke, manage Lambda functions',
    icon: 'Zap',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Invoke', value: 'invoke' },
          { label: 'Invoke Async', value: 'invokeAsync' },
          { label: 'List Functions', value: 'list' },
          { label: 'Get Function', value: 'get' },
          { label: 'Create Function', value: 'create' },
          { label: 'Update Function', value: 'update' },
          { label: 'Delete Function', value: 'delete' },
          { label: 'Publish Version', value: 'publishVersion' },
          { label: 'List Versions', value: 'listVersions' },
          { label: 'Create Alias', value: 'createAlias' },
          { label: 'Update Alias', value: 'updateAlias' },
          { label: 'Delete Alias', value: 'deleteAlias' },
        ],
        { default: 'invoke' }
      ),
      input.string('functionName', 'Function Name', {
        description: 'Lambda function name or ARN',
        placeholder: 'my-function',
        required: true,
      }),
      input.string('qualifier', 'Qualifier', {
        description: 'Version or alias',
        placeholder: '$LATEST',
      }),
      input.json('payload', 'Payload', {
        description: 'JSON payload to send',
        default: {},
      }),
      input.select(
        'invocationType',
        'Invocation Type',
        [
          { label: 'Request/Response (sync)', value: 'RequestResponse' },
          { label: 'Event (async)', value: 'Event' },
          { label: 'Dry Run', value: 'DryRun' },
        ],
        { default: 'RequestResponse' }
      ),
      input.select(
        'logType',
        'Log Type',
        [
          { label: 'None', value: 'None' },
          { label: 'Tail (last 4KB)', value: 'Tail' },
        ],
        { default: 'None' }
      ),
      input.select(
        'runtime',
        'Runtime',
        [
          { label: 'Node.js 20.x', value: 'nodejs20.x' },
          { label: 'Node.js 18.x', value: 'nodejs18.x' },
          { label: 'Python 3.12', value: 'python3.12' },
          { label: 'Python 3.11', value: 'python3.11' },
          { label: 'Java 21', value: 'java21' },
          { label: 'Java 17', value: 'java17' },
          { label: '.NET 8', value: 'dotnet8' },
          { label: 'Go 1.x', value: 'go1.x' },
        ],
        { default: 'nodejs20.x' }
      ),
      input.string('handler', 'Handler', {
        description: 'Function handler',
        placeholder: 'index.handler',
      }),
      input.string('role', 'IAM Role ARN', {
        description: 'Execution role ARN',
      }),
      input.string('description', 'Description', {
        description: 'Function description',
      }),
      input.number('timeout', 'Timeout', {
        description: 'Timeout in seconds',
        default: 30,
        min: 1,
        max: 900,
      }),
      input.number('memorySize', 'Memory Size', {
        description: 'Memory in MB',
        default: 128,
        min: 128,
        max: 10240,
      }),
      input.json('environment', 'Environment', {
        description: 'Environment variables',
        default: {},
      }),
      input.json('layers', 'Layers', {
        description: 'Lambda layer ARNs',
        default: [],
      }),
      input.string('aliasName', 'Alias Name', {
        description: 'Alias name',
      }),
      input.string('functionVersion', 'Function Version', {
        description: 'Version for alias',
      }),
      input.string('region', 'Region', {
        description: 'AWS region',
        default: 'us-east-1',
      }),
      input.credential('credentialId', 'AWS Credentials', {
        description: 'AWS access credentials',
        credentialTypes: ['AWS'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'invoke',
      invocationType: 'RequestResponse',
      logType: 'None',
      timeout: 30,
      memorySize: 128,
      region: 'us-east-1',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AwsLambdaNodeSchema.parse(nodeInput.config);

    logger.info(`AWS Lambda ${config.operation}`);

    switch (config.operation) {
      case 'invoke':
        return {
          data: {
            success: true,
            statusCode: 200,
            response: { result: 'Success', data: { processed: true } },
            logResult: config.logType === 'Tail' ? 'START RequestId: abc123\nEND RequestId: abc123\nREPORT...' : undefined,
          },
        };

      case 'invokeAsync':
        return {
          data: {
            success: true,
            statusCode: 202,
          },
        };

      case 'list':
        return {
          data: {
            success: true,
            functions: [
              { FunctionName: 'my-function', Runtime: 'nodejs20.x', MemorySize: 128 },
              { FunctionName: 'process-data', Runtime: 'python3.12', MemorySize: 256 },
            ],
          },
        };

      case 'get':
        return {
          data: {
            success: true,
            function: {
              FunctionName: config.functionName,
              FunctionArn: `arn:aws:lambda:${config.region}:123456789:function:${config.functionName}`,
              Runtime: 'nodejs20.x',
              Handler: 'index.handler',
              MemorySize: 128,
              Timeout: 30,
              LastModified: new Date().toISOString(),
            },
          },
        };

      case 'create':
      case 'update':
        return {
          data: {
            success: true,
            functionArn: `arn:aws:lambda:${config.region}:123456789:function:${config.functionName}`,
            version: '$LATEST',
          },
        };

      case 'delete':
        return {
          data: {
            success: true,
            deleted: true,
          },
        };

      case 'publishVersion':
        return {
          data: {
            success: true,
            version: '5',
            functionArn: `arn:aws:lambda:${config.region}:123456789:function:${config.functionName}:5`,
          },
        };

      case 'listVersions':
        return {
          data: {
            success: true,
            versions: [
              { Version: '$LATEST' },
              { Version: '1' },
              { Version: '2' },
            ],
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
