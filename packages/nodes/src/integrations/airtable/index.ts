import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AirtableSchema = z.object({
  operation: z.enum(['list', 'get', 'create', 'update', 'delete']).default('list'),
  baseId: z.string(),
  tableId: z.string(),
  recordId: z.string().optional(),
  fields: z.record(z.unknown()).optional(),
  filterByFormula: z.string().optional(),
  maxRecords: z.number().default(100),
});

export const airtableNode: NodeDefinition = createNode(
  {
    type: 'integration.airtable',
    category: 'integration',
    name: 'Airtable',
    description: 'Read and write Airtable records',
    icon: 'Table2',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'List Records', value: 'list' },
        { label: 'Get Record', value: 'get' },
        { label: 'Create Record', value: 'create' },
        { label: 'Update Record', value: 'update' },
        { label: 'Delete Record', value: 'delete' },
      ], { default: 'list' }),
      input.string('baseId', 'Base ID', { required: true }),
      input.string('tableId', 'Table ID', { required: true }),
      input.string('recordId', 'Record ID', {}),
      input.json('fields', 'Fields', { description: 'Record fields' }),
      input.string('filterByFormula', 'Filter Formula', { description: 'Airtable filter formula' }),
      input.number('maxRecords', 'Max Records', { default: 100 }),
    ],
    outputs: [output.array('records', 'Airtable records'), output.object('record', 'Single record')],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const config = AirtableSchema.parse(nodeInput.config);
    context.logger.info(`Airtable: ${config.operation}`);
    return { data: { records: [], record: {}, __needsExecution: true } };
  }
);
