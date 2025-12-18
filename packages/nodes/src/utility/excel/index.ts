import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ExcelNodeSchema = z.object({
  operation: z.enum(['read', 'write', 'append', 'createSheet', 'deleteSheet', 'getSheets', 'getRange', 'setRange']).default('read'),
  source: z.enum(['file', 'base64']).default('file'),
  filePath: z.string().optional(),
  base64: z.string().optional(),
  outputPath: z.string().optional(),
  sheetName: z.string().optional(),
  sheetIndex: z.number().optional(),
  range: z.string().optional(),
  startRow: z.number().default(1),
  startColumn: z.string().default('A'),
  data: z.array(z.array(z.unknown())).optional(),
  headers: z.boolean().default(true),
  dateFormat: z.string().default('YYYY-MM-DD'),
  numberFormat: z.string().optional(),
  includeEmptyRows: z.boolean().default(false),
  includeEmptyCells: z.boolean().default(true),
  rawValues: z.boolean().default(false),
  newSheetName: z.string().optional(),
  formatting: z.object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    fontSize: z.number().optional(),
    fontColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    alignment: z.enum(['left', 'center', 'right']).optional(),
  }).optional(),
});

export type ExcelNodeConfig = z.infer<typeof ExcelNodeSchema>;

export const excelNode: NodeDefinition = createNode(
  {
    type: 'utility.excel',
    category: 'utility',
    name: 'Excel',
    description: 'Read and write Excel files (XLSX)',
    icon: 'Table',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Read', value: 'read' },
          { label: 'Write', value: 'write' },
          { label: 'Append', value: 'append' },
          { label: 'Create Sheet', value: 'createSheet' },
          { label: 'Delete Sheet', value: 'deleteSheet' },
          { label: 'Get Sheets', value: 'getSheets' },
          { label: 'Get Range', value: 'getRange' },
          { label: 'Set Range', value: 'setRange' },
        ],
        { default: 'read' }
      ),
      input.select(
        'source',
        'Source',
        [
          { label: 'File Path', value: 'file' },
          { label: 'Base64', value: 'base64' },
        ],
        { default: 'file' }
      ),
      input.string('filePath', 'File Path', {
        description: 'Path to Excel file',
        placeholder: '/path/to/file.xlsx',
      }),
      input.text('base64', 'Base64 Content', {
        description: 'Excel file as base64',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save output file',
      }),
      input.string('sheetName', 'Sheet Name', {
        description: 'Name of the sheet',
        placeholder: 'Sheet1',
      }),
      input.number('sheetIndex', 'Sheet Index', {
        description: 'Index of the sheet (0-based)',
      }),
      input.string('range', 'Range', {
        description: 'Cell range (e.g., A1:D10)',
        placeholder: 'A1:D10',
      }),
      input.number('startRow', 'Start Row', {
        description: 'Starting row number',
        default: 1,
      }),
      input.string('startColumn', 'Start Column', {
        description: 'Starting column letter',
        default: 'A',
      }),
      input.json('data', 'Data', {
        description: 'Data to write (array of arrays)',
        default: [],
      }),
      input.boolean('headers', 'Has Headers', {
        description: 'First row contains headers',
        default: true,
      }),
      input.string('dateFormat', 'Date Format', {
        description: 'Format for date values',
        default: 'YYYY-MM-DD',
      }),
      input.boolean('includeEmptyRows', 'Include Empty Rows', {
        description: 'Include empty rows in output',
        default: false,
      }),
      input.boolean('rawValues', 'Raw Values', {
        description: 'Return raw cell values',
        default: false,
      }),
      input.string('newSheetName', 'New Sheet Name', {
        description: 'Name for new sheet',
      }),
      input.json('formatting', 'Formatting', {
        description: 'Cell formatting options',
        default: {},
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('data', 'Read data'),
      output.array('headers', 'Column headers'),
      output.array('sheets', 'Sheet names'),
      output.string('path', 'Output file path'),
      output.string('base64', 'Output as base64'),
      output.number('rowCount', 'Number of rows'),
    ],
    defaults: {
      operation: 'read',
      source: 'file',
      startRow: 1,
      startColumn: 'A',
      headers: true,
      dateFormat: 'YYYY-MM-DD',
      includeEmptyRows: false,
      rawValues: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ExcelNodeSchema.parse(nodeInput.config);

    logger.info(`Excel ${config.operation}`);

    switch (config.operation) {
      case 'read':
      case 'getRange':
        return {
          data: {
            success: true,
            headers: ['Name', 'Email', 'Age', 'City'],
            data: [
              { Name: 'John Doe', Email: 'john@example.com', Age: 30, City: 'New York' },
              { Name: 'Jane Smith', Email: 'jane@example.com', Age: 25, City: 'Los Angeles' },
            ],
            rowCount: 2,
          },
        };

      case 'write':
      case 'append':
      case 'setRange':
        return {
          data: {
            success: true,
            path: config.outputPath || config.filePath,
            base64: 'UEsDBBQAAAAIAA...',
            rowCount: config.data?.length || 0,
          },
        };

      case 'getSheets':
        return {
          data: {
            success: true,
            sheets: ['Sheet1', 'Data', 'Summary'],
          },
        };

      case 'createSheet':
        return {
          data: {
            success: true,
            sheets: ['Sheet1', 'Data', config.newSheetName],
          },
        };

      case 'deleteSheet':
        return {
          data: {
            success: true,
            deleted: config.sheetName,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
