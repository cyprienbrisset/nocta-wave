import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MysqlSchema = z.object({
  operation: z.enum(['query', 'insert', 'update', 'delete']).default('query'),
  query: z.string().optional(),
  table: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  where: z.record(z.unknown()).optional(),
});

export const mysqlNode: NodeDefinition = createNode(
  {
    type: 'database.mysql',
    category: 'database',
    name: 'MySQL',
    description: 'Execute MySQL queries and operations',
    icon: 'Database',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Raw Query', value: 'query' },
        { label: 'Insert', value: 'insert' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ], { default: 'query' }),
      input.code('query', 'SQL Query', { description: 'Raw SQL query' }),
      input.string('table', 'Table', { description: 'Table name' }),
      input.json('data', 'Data', { description: 'Data to insert or update' }),
      input.json('where', 'Where Clause', { description: 'Where clause' }),
    ],
    outputs: [output.array('rows', 'Query results'), output.number('affectedRows', 'Affected rows')],
    credentials: ['custom'],
  },
  async (nodeInput, context) => {
    const config = MysqlSchema.parse(nodeInput.config);
    context.logger.info(`MySQL: ${config.operation}`);
    return { data: { rows: [], affectedRows: 0, __needsExecution: true } };
  }
);
