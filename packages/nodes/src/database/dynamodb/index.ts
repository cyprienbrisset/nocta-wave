import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const DynamoDBNodeSchema = z.object({
  operation: z.enum([
    'getItem', 'putItem', 'updateItem', 'deleteItem',
    'query', 'scan', 'batchGetItem', 'batchWriteItem',
    'createTable', 'deleteTable', 'describeTable', 'listTables',
    'transactGetItems', 'transactWriteItems'
  ]).default('getItem'),
  tableName: z.string().optional(),
  key: z.record(z.unknown()).optional(),
  item: z.record(z.unknown()).optional(),
  items: z.array(z.record(z.unknown())).optional(),
  updateExpression: z.string().optional(),
  conditionExpression: z.string().optional(),
  keyConditionExpression: z.string().optional(),
  filterExpression: z.string().optional(),
  projectionExpression: z.string().optional(),
  expressionAttributeNames: z.record(z.string()).optional(),
  expressionAttributeValues: z.record(z.unknown()).optional(),
  indexName: z.string().optional(),
  limit: z.number().optional(),
  scanIndexForward: z.boolean().default(true),
  consistentRead: z.boolean().default(false),
  exclusiveStartKey: z.record(z.unknown()).optional(),
  returnValues: z.enum(['NONE', 'ALL_OLD', 'UPDATED_OLD', 'ALL_NEW', 'UPDATED_NEW']).default('NONE'),
  attributeDefinitions: z.array(z.object({
    AttributeName: z.string(),
    AttributeType: z.enum(['S', 'N', 'B']),
  })).optional(),
  keySchema: z.array(z.object({
    AttributeName: z.string(),
    KeyType: z.enum(['HASH', 'RANGE']),
  })).optional(),
  billingMode: z.enum(['PROVISIONED', 'PAY_PER_REQUEST']).default('PAY_PER_REQUEST'),
  credentialId: z.string().optional(),
});

export type DynamoDBNodeConfig = z.infer<typeof DynamoDBNodeSchema>;

export const dynamodbNode: NodeDefinition = createNode(
  {
    type: 'database.dynamodb',
    category: 'database',
    name: 'DynamoDB',
    description: 'AWS NoSQL database - Key-value and document data',
    icon: 'Database',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Get Item', value: 'getItem' },
          { label: 'Put Item', value: 'putItem' },
          { label: 'Update Item', value: 'updateItem' },
          { label: 'Delete Item', value: 'deleteItem' },
          { label: 'Query', value: 'query' },
          { label: 'Scan', value: 'scan' },
          { label: 'Batch Get Items', value: 'batchGetItem' },
          { label: 'Batch Write Items', value: 'batchWriteItem' },
          { label: 'Create Table', value: 'createTable' },
          { label: 'Delete Table', value: 'deleteTable' },
          { label: 'Describe Table', value: 'describeTable' },
          { label: 'List Tables', value: 'listTables' },
          { label: 'Transaction Get', value: 'transactGetItems' },
          { label: 'Transaction Write', value: 'transactWriteItems' },
        ],
        { default: 'getItem' }
      ),
      input.string('tableName', 'Table Name', {
        description: 'DynamoDB table name',
        placeholder: 'my-table',
        required: true,
      }),
      input.json('key', 'Key', {
        description: 'Primary key for get/update/delete',
        default: {},
      }),
      input.json('item', 'Item', {
        description: 'Item to put',
        default: {},
      }),
      input.json('items', 'Items', {
        description: 'Items for batch operations',
        default: [],
      }),
      input.string('updateExpression', 'Update Expression', {
        description: 'SET, REMOVE, ADD, DELETE expressions',
        placeholder: 'SET #name = :name',
      }),
      input.string('conditionExpression', 'Condition Expression', {
        description: 'Condition for operation',
      }),
      input.string('keyConditionExpression', 'Key Condition', {
        description: 'Key condition for query',
        placeholder: 'pk = :pk AND sk BEGINS_WITH :sk',
      }),
      input.string('filterExpression', 'Filter Expression', {
        description: 'Filter after query/scan',
      }),
      input.string('projectionExpression', 'Projection Expression', {
        description: 'Attributes to retrieve',
        placeholder: 'id, name, email',
      }),
      input.json('expressionAttributeNames', 'Attribute Names', {
        description: 'Placeholder for attribute names',
        default: {},
      }),
      input.json('expressionAttributeValues', 'Attribute Values', {
        description: 'Placeholder for attribute values',
        default: {},
      }),
      input.string('indexName', 'Index Name', {
        description: 'GSI or LSI name',
      }),
      input.number('limit', 'Limit', {
        description: 'Maximum items to return',
      }),
      input.boolean('scanIndexForward', 'Scan Forward', {
        description: 'Ascending order (true) or descending (false)',
        default: true,
      }),
      input.boolean('consistentRead', 'Consistent Read', {
        description: 'Strongly consistent read',
        default: false,
      }),
      input.select(
        'returnValues',
        'Return Values',
        [
          { label: 'None', value: 'NONE' },
          { label: 'All Old', value: 'ALL_OLD' },
          { label: 'Updated Old', value: 'UPDATED_OLD' },
          { label: 'All New', value: 'ALL_NEW' },
          { label: 'Updated New', value: 'UPDATED_NEW' },
        ],
        { default: 'NONE' }
      ),
      input.select(
        'billingMode',
        'Billing Mode',
        [
          { label: 'Pay Per Request', value: 'PAY_PER_REQUEST' },
          { label: 'Provisioned', value: 'PROVISIONED' },
        ],
        { default: 'PAY_PER_REQUEST' }
      ),
      input.credential('credentialId', 'AWS Credentials', {
        description: 'AWS access credentials',
        credentialTypes: ['AWS'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('item', 'Single item'),
      output.array('items', 'Item list'),
      output.number('count', 'Item count'),
      output.number('scannedCount', 'Scanned count'),
      output.object('lastEvaluatedKey', 'Pagination key'),
    ],
    defaults: {
      operation: 'getItem',
      key: {},
      item: {},
      scanIndexForward: true,
      consistentRead: false,
      returnValues: 'NONE',
      billingMode: 'PAY_PER_REQUEST',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = DynamoDBNodeSchema.parse(nodeInput.config);

    logger.info(`DynamoDB ${config.operation} on ${config.tableName}`);

    switch (config.operation) {
      case 'getItem':
        return {
          data: {
            success: true,
            item: {
              pk: { S: 'USER#123' },
              sk: { S: 'PROFILE' },
              name: { S: 'John Doe' },
              email: { S: 'john@example.com' },
            },
          },
        };

      case 'putItem':
        return {
          data: {
            success: true,
            consumedCapacity: { TableName: config.tableName, CapacityUnits: 1 },
          },
        };

      case 'updateItem':
        return {
          data: {
            success: true,
            attributes: config.item,
          },
        };

      case 'deleteItem':
        return {
          data: {
            success: true,
          },
        };

      case 'query':
        return {
          data: {
            success: true,
            items: [
              { pk: { S: 'USER#123' }, sk: { S: 'ORDER#1' }, total: { N: '99.99' } },
              { pk: { S: 'USER#123' }, sk: { S: 'ORDER#2' }, total: { N: '149.99' } },
            ],
            count: 2,
            scannedCount: 2,
            lastEvaluatedKey: null,
          },
        };

      case 'scan':
        return {
          data: {
            success: true,
            items: [
              { pk: { S: 'USER#1' }, name: { S: 'John' } },
              { pk: { S: 'USER#2' }, name: { S: 'Jane' } },
            ],
            count: 2,
            scannedCount: 100,
            lastEvaluatedKey: { pk: { S: 'USER#2' } },
          },
        };

      case 'batchGetItem':
        return {
          data: {
            success: true,
            responses: {
              [config.tableName || 'table']: [
                { pk: { S: 'USER#1' }, name: { S: 'John' } },
              ],
            },
            unprocessedKeys: {},
          },
        };

      case 'batchWriteItem':
        return {
          data: {
            success: true,
            unprocessedItems: {},
          },
        };

      case 'createTable':
        return {
          data: {
            success: true,
            tableDescription: {
              TableName: config.tableName,
              TableStatus: 'CREATING',
            },
          },
        };

      case 'deleteTable':
        return {
          data: {
            success: true,
            tableDescription: {
              TableName: config.tableName,
              TableStatus: 'DELETING',
            },
          },
        };

      case 'describeTable':
        return {
          data: {
            success: true,
            table: {
              TableName: config.tableName,
              TableStatus: 'ACTIVE',
              ItemCount: 1500,
              TableSizeBytes: 256000,
            },
          },
        };

      case 'listTables':
        return {
          data: {
            success: true,
            tableNames: ['users', 'orders', 'products'],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
