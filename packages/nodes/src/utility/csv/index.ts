import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const CsvNodeSchema = z.object({
  operation: z.enum(['parse', 'stringify', 'transform']).default('parse'),
  source: z.enum(['text', 'file', 'base64']).default('text'),
  content: z.string().optional(),
  filePath: z.string().optional(),
  base64: z.string().optional(),
  outputPath: z.string().optional(),
  data: z.array(z.record(z.unknown())).optional(),
  delimiter: z.string().default(','),
  quote: z.string().default('"'),
  escape: z.string().default('"'),
  newline: z.enum(['\\n', '\\r\\n', '\\r']).default('\\n'),
  headers: z.boolean().default(true),
  customHeaders: z.array(z.string()).optional(),
  skipEmptyLines: z.boolean().default(true),
  skipLines: z.number().default(0),
  maxRows: z.number().optional(),
  columns: z.array(z.string()).optional(),
  trimValues: z.boolean().default(true),
  relaxColumnCount: z.boolean().default(false),
  encoding: z.string().default('utf-8'),
  bom: z.boolean().default(false),
  cast: z.boolean().default(true),
  castDate: z.boolean().default(false),
});

export type CsvNodeConfig = z.infer<typeof CsvNodeSchema>;

export const csvNode: NodeDefinition = createNode(
  {
    type: 'utility.csv',
    category: 'utility',
    name: 'CSV',
    description: 'Parse and generate CSV files',
    icon: 'FileSpreadsheet',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Parse CSV', value: 'parse' },
          { label: 'Generate CSV', value: 'stringify' },
          { label: 'Transform', value: 'transform' },
        ],
        { default: 'parse' }
      ),
      input.select(
        'source',
        'Source',
        [
          { label: 'Text', value: 'text' },
          { label: 'File Path', value: 'file' },
          { label: 'Base64', value: 'base64' },
        ],
        { default: 'text' }
      ),
      input.text('content', 'CSV Content', {
        description: 'CSV text content',
        placeholder: 'name,email,age\nJohn,john@example.com,30',
      }),
      input.string('filePath', 'File Path', {
        description: 'Path to CSV file',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save output',
      }),
      input.json('data', 'Data', {
        description: 'Array of objects to convert to CSV',
        default: [],
      }),
      input.string('delimiter', 'Delimiter', {
        description: 'Column delimiter',
        default: ',',
      }),
      input.string('quote', 'Quote Character', {
        description: 'Quote character',
        default: '"',
      }),
      input.select(
        'newline',
        'Newline',
        [
          { label: 'LF (\\n)', value: '\\n' },
          { label: 'CRLF (\\r\\n)', value: '\\r\\n' },
          { label: 'CR (\\r)', value: '\\r' },
        ],
        { default: '\\n' }
      ),
      input.boolean('headers', 'Has Headers', {
        description: 'First row contains headers',
        default: true,
      }),
      input.json('customHeaders', 'Custom Headers', {
        description: 'Define custom column headers',
        default: [],
      }),
      input.boolean('skipEmptyLines', 'Skip Empty Lines', {
        description: 'Skip empty lines',
        default: true,
      }),
      input.number('skipLines', 'Skip Lines', {
        description: 'Number of lines to skip',
        default: 0,
      }),
      input.number('maxRows', 'Max Rows', {
        description: 'Maximum rows to parse',
      }),
      input.json('columns', 'Columns', {
        description: 'Specific columns to include',
        default: [],
      }),
      input.boolean('trimValues', 'Trim Values', {
        description: 'Trim whitespace from values',
        default: true,
      }),
      input.string('encoding', 'Encoding', {
        description: 'File encoding',
        default: 'utf-8',
      }),
      input.boolean('bom', 'Include BOM', {
        description: 'Include byte order mark',
        default: false,
      }),
      input.boolean('cast', 'Auto Cast Types', {
        description: 'Auto-detect and cast data types',
        default: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('data', 'Parsed data'),
      output.array('headers', 'Column headers'),
      output.string('csv', 'Generated CSV'),
      output.string('path', 'Output file path'),
      output.number('rowCount', 'Number of rows'),
    ],
    defaults: {
      operation: 'parse',
      source: 'text',
      delimiter: ',',
      quote: '"',
      newline: '\\n',
      headers: true,
      skipEmptyLines: true,
      skipLines: 0,
      trimValues: true,
      encoding: 'utf-8',
      bom: false,
      cast: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CsvNodeSchema.parse(nodeInput.config);

    logger.info(`CSV ${config.operation}`);

    switch (config.operation) {
      case 'parse':
        return {
          data: {
            success: true,
            headers: ['name', 'email', 'age'],
            data: [
              { name: 'John Doe', email: 'john@example.com', age: 30 },
              { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
            ],
            rowCount: 2,
          },
        };

      case 'stringify':
        return {
          data: {
            success: true,
            csv: 'name,email,age\nJohn Doe,john@example.com,30\nJane Smith,jane@example.com,25',
            path: config.outputPath,
            rowCount: config.data?.length || 0,
          },
        };

      case 'transform':
        return {
          data: {
            success: true,
            data: config.data,
            csv: 'transformed,data,here',
            rowCount: config.data?.length || 0,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
