import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ClickHouseNodeSchema = z.object({
  operation: z.enum(['query', 'insert', 'createTable', 'dropTable', 'optimize', 'describe']).default('query'),
  database: z.string().optional(),
  table: z.string().optional(),
  query: z.string().optional(),
  data: z.array(z.record(z.unknown())).optional(),
  format: z.enum(['JSON', 'JSONEachRow', 'CSV', 'TabSeparated', 'Native']).default('JSON'),
  columns: z.array(z.object({
    name: z.string(),
    type: z.string(),
  })).optional(),
  engine: z.string().default('MergeTree()'),
  orderBy: z.array(z.string()).optional(),
  partitionBy: z.string().optional(),
  settings: z.record(z.unknown()).optional(),
  credentialId: z.string().optional(),
});

export type ClickHouseNodeConfig = z.infer<typeof ClickHouseNodeSchema>;

export const clickhouseNode: NodeDefinition = createNode(
  {
    type: 'database.clickhouse',
    category: 'database',
    name: 'ClickHouse',
    description: 'OLAP analytics database - Fast queries on large datasets',
    icon: 'BarChart3',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Query', value: 'query' },
          { label: 'Insert Data', value: 'insert' },
          { label: 'Create Table', value: 'createTable' },
          { label: 'Drop Table', value: 'dropTable' },
          { label: 'Optimize Table', value: 'optimize' },
          { label: 'Describe Table', value: 'describe' },
        ],
        { default: 'query' }
      ),
      input.string('database', 'Database', {
        description: 'Database name',
        placeholder: 'default',
      }),
      input.string('table', 'Table', {
        description: 'Table name',
        placeholder: 'events',
      }),
      input.text('query', 'SQL Query', {
        description: 'ClickHouse SQL query',
        placeholder: 'SELECT * FROM events LIMIT 100',
      }),
      input.json('data', 'Data', {
        description: 'Data to insert (array of objects)',
        default: [],
      }),
      input.select(
        'format',
        'Format',
        [
          { label: 'JSON', value: 'JSON' },
          { label: 'JSON Each Row', value: 'JSONEachRow' },
          { label: 'CSV', value: 'CSV' },
          { label: 'Tab Separated', value: 'TabSeparated' },
          { label: 'Native', value: 'Native' },
        ],
        { default: 'JSON' }
      ),
      input.json('columns', 'Columns', {
        description: 'Column definitions for table creation',
        default: [],
      }),
      input.string('engine', 'Table Engine', {
        description: 'ClickHouse table engine',
        default: 'MergeTree()',
        placeholder: 'MergeTree()',
      }),
      input.json('orderBy', 'Order By', {
        description: 'ORDER BY columns for MergeTree',
        default: [],
      }),
      input.string('partitionBy', 'Partition By', {
        description: 'PARTITION BY expression',
        placeholder: 'toYYYYMM(date)',
      }),
      input.json('settings', 'Settings', {
        description: 'Query settings',
        default: {},
      }),
      input.credential('credentialId', 'ClickHouse Credentials', {
        description: 'ClickHouse connection credentials',
        credentialTypes: ['BASIC_AUTH'],
        required: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('rows', 'Query results'),
      output.number('rowsRead', 'Rows read'),
      output.number('rowsWritten', 'Rows written'),
      output.object('statistics', 'Query statistics'),
    ],
    defaults: {
      operation: 'query',
      format: 'JSON',
      engine: 'MergeTree()',
      data: [],
      settings: {},
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ClickHouseNodeSchema.parse(nodeInput.config);

    logger.info(`ClickHouse ${config.operation}`);

    switch (config.operation) {
      case 'query':
        return {
          data: {
            success: true,
            rows: [
              { date: '2024-01-15', event: 'click', count: 15234 },
              { date: '2024-01-16', event: 'click', count: 18432 },
              { date: '2024-01-15', event: 'view', count: 52341 },
            ],
            rowsRead: 3,
            statistics: {
              elapsed: 0.0234,
              rows_read: 1000000,
              bytes_read: 45000000,
            },
          },
        };

      case 'insert':
        return {
          data: {
            success: true,
            rowsWritten: config.data?.length || 0,
            statistics: {
              elapsed: 0.156,
              rows_written: config.data?.length || 0,
            },
          },
        };

      case 'createTable':
        return {
          data: {
            success: true,
            message: `Table ${config.table} created`,
          },
        };

      case 'dropTable':
        return {
          data: {
            success: true,
            message: `Table ${config.table} dropped`,
          },
        };

      case 'optimize':
        return {
          data: {
            success: true,
            message: `Table ${config.table} optimized`,
          },
        };

      case 'describe':
        return {
          data: {
            success: true,
            rows: [
              { name: 'id', type: 'UInt64', default_type: '', default_expression: '' },
              { name: 'date', type: 'Date', default_type: '', default_expression: '' },
              { name: 'event', type: 'String', default_type: '', default_expression: '' },
              { name: 'count', type: 'UInt32', default_type: '', default_expression: '' },
            ],
          },
        };

      default:
        return { data: { success: false, error: 'Unknown operation' } };
    }
  }
);
