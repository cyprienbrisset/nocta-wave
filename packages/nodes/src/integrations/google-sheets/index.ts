import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GoogleSheetsSchema = z.object({
  operation: z.enum(['read', 'append', 'update', 'clear', 'create']).default('read'),
  spreadsheetId: z.string(),
  range: z.string().optional(),
  values: z.array(z.array(z.unknown())).optional(),
  title: z.string().optional(),
});

export const googleSheetsNode: NodeDefinition = createNode(
  {
    type: 'integration.google-sheets',
    category: 'integration',
    name: 'Google Sheets',
    description: 'Read and write data to Google Sheets',
    icon: 'Table',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Read Data', value: 'read' },
        { label: 'Append Rows', value: 'append' },
        { label: 'Update Cells', value: 'update' },
        { label: 'Clear Range', value: 'clear' },
        { label: 'Create Spreadsheet', value: 'create' },
      ], { default: 'read' }),
      input.string('spreadsheetId', 'Spreadsheet ID', { required: true }),
      input.string('range', 'Range', { description: 'e.g., Sheet1!A1:D10', placeholder: 'Sheet1!A1:D10' }),
      input.json('values', 'Values', { description: '2D array of values' }),
      input.string('title', 'Title', { description: 'Spreadsheet title (for create)' }),
    ],
    outputs: [output.main({ description: 'Google Sheets operation result' })],
    credentials: ['oauth2'],
  },
  async (nodeInput, context) => {
    const config = GoogleSheetsSchema.parse(nodeInput.config);
    context.logger.info(`Google Sheets: ${config.operation}`);
    // Implementation would use Google Sheets API
    return { data: { values: [], spreadsheet: {}, __needsExecution: true } };
  }
);
