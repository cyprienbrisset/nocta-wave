import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PostgresSchema = z.object({
  operation: z.enum(['query', 'insert', 'update', 'delete']).default('query'),
  query: z.string().optional(),
  table: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  where: z.record(z.unknown()).optional(),
  returning: z.boolean().default(true),
});

export type PostgresConfig = z.infer<typeof PostgresSchema>;

export const postgresNode: NodeDefinition = createNode(
  {
    type: 'database.postgres',
    category: 'database',
    name: 'PostgreSQL',
    description: 'Execute PostgreSQL queries and operations',
    icon: 'Database',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Raw Query', value: 'query' },
          { label: 'Insert', value: 'insert' },
          { label: 'Update', value: 'update' },
          { label: 'Delete', value: 'delete' },
        ],
        { default: 'query' }
      ),
      input.code('query', 'SQL Query', {
        description: 'Raw SQL query (for query operation)',
        placeholder: 'SELECT * FROM users WHERE id = $1',
        displayOptions: { show: { operation: ['query'] } },
      }),
      input.string('table', 'Table', {
        description: 'Table name',
        placeholder: 'users',
        displayOptions: { show: { operation: ['insert', 'update', 'delete'] } },
      }),
      input.json('data', 'Data', {
        description: 'Data to insert or update',
        displayOptions: { show: { operation: ['insert', 'update'] } },
      }),
      input.json('where', 'Where Clause', {
        description: 'Where clause as key-value pairs',
        placeholder: '{ "id": 1 }',
        displayOptions: { show: { operation: ['update', 'delete'] } },
      }),
      input.boolean('returning', 'Return Result', {
        default: true,
        description: 'Return the affected rows',
      }),
    ],
    outputs: [output.main({ description: 'Database operation result' })],
    credentials: ['custom'],
    defaults: {
      operation: 'query',
      returning: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PostgresSchema.parse(nodeInput.config);

    logger.info(`PostgreSQL: ${config.operation}`);

    // In a real implementation, you would use a PostgreSQL client here
    // This is a placeholder that shows the structure
    const credentials = nodeInput.credentials as Record<string, string> | undefined;
    if (!credentials?.connectionString && !credentials?.host) {
      throw new Error('PostgreSQL credentials are required');
    }

    // Build query based on operation
    let query = '';
    const params: unknown[] = [];

    switch (config.operation) {
      case 'query':
        query = config.query || '';
        break;

      case 'insert':
        if (!config.table || !config.data) {
          throw new Error('Table and data are required for insert');
        }
        const insertKeys = Object.keys(config.data);
        const insertValues = Object.values(config.data);
        query = `INSERT INTO ${config.table} (${insertKeys.join(', ')}) VALUES (${insertKeys.map((_, i) => `$${i + 1}`).join(', ')})${config.returning ? ' RETURNING *' : ''}`;
        params.push(...insertValues);
        break;

      case 'update':
        if (!config.table || !config.data || !config.where) {
          throw new Error('Table, data, and where are required for update');
        }
        const updatePairs = Object.keys(config.data)
          .map((k, i) => `${k} = $${i + 1}`)
          .join(', ');
        const whereKeys = Object.keys(config.where);
        const wherePairs = whereKeys
          .map((k, i) => `${k} = $${Object.keys(config.data!).length + i + 1}`)
          .join(' AND ');
        query = `UPDATE ${config.table} SET ${updatePairs} WHERE ${wherePairs}${config.returning ? ' RETURNING *' : ''}`;
        params.push(...Object.values(config.data), ...Object.values(config.where));
        break;

      case 'delete':
        if (!config.table || !config.where) {
          throw new Error('Table and where are required for delete');
        }
        const deleteWhere = Object.keys(config.where)
          .map((k, i) => `${k} = $${i + 1}`)
          .join(' AND ');
        query = `DELETE FROM ${config.table} WHERE ${deleteWhere}${config.returning ? ' RETURNING *' : ''}`;
        params.push(...Object.values(config.where));
        break;
    }

    logger.info(`Query: ${query}`);
    logger.info(`Params: ${JSON.stringify(params)}`);

    // Placeholder response - in real implementation, execute the query
    return {
      data: {
        rows: [],
        rowCount: 0,
        query,
        params,
        __needsExecution: true,
      },
    };
  }
);
