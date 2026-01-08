import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const MongodbSchema = z.object({
  operation: z.enum(['find', 'findOne', 'insert', 'update', 'delete', 'aggregate']).default('find'),
  collection: z.string().min(1),
  query: z.record(z.unknown()).optional(),
  data: z.record(z.unknown()).optional(),
  pipeline: z.array(z.record(z.unknown())).optional(),
  options: z.record(z.unknown()).optional(),
});

export const mongodbNode: NodeDefinition = createNode(
  {
    type: 'database.mongodb',
    category: 'database',
    name: 'MongoDB',
    description: 'Execute MongoDB operations',
    icon: 'Database',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Find', value: 'find' },
        { label: 'Find One', value: 'findOne' },
        { label: 'Insert', value: 'insert' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Aggregate', value: 'aggregate' },
      ], { default: 'find' }),
      input.string('collection', 'Collection', { required: true, description: 'Collection name' }),
      input.json('query', 'Query', { description: 'Query filter' }),
      input.json('data', 'Data', { description: 'Document to insert or update' }),
      input.json('pipeline', 'Pipeline', { description: 'Aggregation pipeline' }),
      input.json('options', 'Options', { description: 'Additional options' }),
    ],
    outputs: [output.main({ description: 'MongoDB operation result' })],
    credentials: ['custom'],
  },
  async (nodeInput, context) => {
    const config = MongodbSchema.parse(nodeInput.config);
    context.logger.info(`MongoDB: ${config.operation} on ${config.collection}`);
    return { data: { documents: [], count: 0, __needsExecution: true } };
  }
);
