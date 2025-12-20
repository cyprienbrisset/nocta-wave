import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

// Formula helper schema
const FormulaSchema = z.object({
  cell: z.string(),
  formula: z.string(),
});

// Cell style schema
const CellStyleSchema = z.object({
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  underline: z.boolean().optional(),
  fontSize: z.number().optional(),
  fontColor: z.string().optional(),
  backgroundColor: z.string().optional(),
  alignment: z.enum(['left', 'center', 'right']).optional(),
  verticalAlignment: z.enum(['top', 'middle', 'bottom']).optional(),
  wrapText: z.boolean().optional(),
  numberFormat: z.string().optional(),
  border: z.object({
    top: z.boolean().optional(),
    right: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    color: z.string().optional(),
    style: z.enum(['thin', 'medium', 'thick', 'dashed', 'dotted']).optional(),
  }).optional(),
});

// Column definition schema for structured data
const ColumnDefinitionSchema = z.object({
  name: z.string(),
  key: z.string(),
  width: z.number().optional(),
  type: z.enum(['string', 'number', 'date', 'boolean', 'formula']).optional(),
  format: z.string().optional(),
  style: CellStyleSchema.optional(),
});

export const ExcelNodeSchema = z.object({
  operation: z.enum([
    'read',
    'write',
    'append',
    'createSheet',
    'deleteSheet',
    'getSheets',
    'getRange',
    'setRange',
    'setFormula',
    'setFormulas',
    'calculateFormulas',
    'getCellValue',
    'setCellStyle',
    'mergeCells',
    'unmergeCells',
    'insertRows',
    'insertColumns',
    'deleteRows',
    'deleteColumns',
    'autoFilter',
    'sortData',
    'addChart',
    'addImage',
    'protectSheet',
    'unprotectSheet',
  ]).default('read'),
  source: z.enum(['file', 'base64', 'url']).default('file'),
  filePath: z.string().optional(),
  base64: z.string().optional(),
  url: z.string().optional(),
  outputPath: z.string().optional(),
  outputFormat: z.enum(['xlsx', 'xls', 'csv', 'pdf', 'base64']).default('xlsx'),
  sheetName: z.string().optional(),
  sheetIndex: z.number().optional(),
  range: z.string().optional(),
  startRow: z.number().default(1),
  startColumn: z.string().default('A'),
  endRow: z.number().optional(),
  endColumn: z.string().optional(),
  data: z.array(z.record(z.unknown())).optional(),
  rawData: z.array(z.array(z.unknown())).optional(),
  headers: z.boolean().default(true),
  columnDefinitions: z.array(ColumnDefinitionSchema).optional(),
  formula: z.string().optional(),
  formulas: z.array(FormulaSchema).optional(),
  cell: z.string().optional(),
  cellValue: z.unknown().optional(),
  style: CellStyleSchema.optional(),
  mergeRange: z.string().optional(),
  rowIndex: z.number().optional(),
  columnIndex: z.number().optional(),
  count: z.number().default(1),
  filterColumn: z.string().optional(),
  sortColumn: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  chartType: z.enum(['bar', 'line', 'pie', 'area', 'scatter', 'doughnut']).optional(),
  chartRange: z.string().optional(),
  chartPosition: z.string().optional(),
  imageBase64: z.string().optional(),
  imagePosition: z.string().optional(),
  password: z.string().optional(),
  dateFormat: z.string().default('YYYY-MM-DD'),
  numberFormat: z.string().optional(),
  includeEmptyRows: z.boolean().default(false),
  includeEmptyCells: z.boolean().default(true),
  rawValues: z.boolean().default(false),
  evaluateFormulas: z.boolean().default(true),
  newSheetName: z.string().optional(),
  createIfNotExists: z.boolean().default(true),
});

export type ExcelNodeConfig = z.infer<typeof ExcelNodeSchema>;

export const excelNode: NodeDefinition = createNode(
  {
    type: 'utility.excel',
    category: 'utility',
    name: 'Excel',
    description: 'Advanced Excel operations with formulas, styling, charts, and data manipulation',
    icon: 'Table',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: '📖 Read Workbook', value: 'read' },
          { label: '✏️ Write Workbook', value: 'write' },
          { label: '➕ Append Data', value: 'append' },
          { label: '📄 Create Sheet', value: 'createSheet' },
          { label: '🗑️ Delete Sheet', value: 'deleteSheet' },
          { label: '📋 Get Sheets', value: 'getSheets' },
          { label: '📍 Get Range', value: 'getRange' },
          { label: '📝 Set Range', value: 'setRange' },
          { label: '🔢 Set Formula', value: 'setFormula' },
          { label: '🔢 Set Multiple Formulas', value: 'setFormulas' },
          { label: '🧮 Calculate Formulas', value: 'calculateFormulas' },
          { label: '📌 Get Cell Value', value: 'getCellValue' },
          { label: '🎨 Set Cell Style', value: 'setCellStyle' },
          { label: '🔗 Merge Cells', value: 'mergeCells' },
          { label: '✂️ Unmerge Cells', value: 'unmergeCells' },
          { label: '➕ Insert Rows', value: 'insertRows' },
          { label: '➕ Insert Columns', value: 'insertColumns' },
          { label: '🗑️ Delete Rows', value: 'deleteRows' },
          { label: '🗑️ Delete Columns', value: 'deleteColumns' },
          { label: '🔍 Auto Filter', value: 'autoFilter' },
          { label: '🔀 Sort Data', value: 'sortData' },
          { label: '📊 Add Chart', value: 'addChart' },
          { label: '🖼️ Add Image', value: 'addImage' },
          { label: '🔒 Protect Sheet', value: 'protectSheet' },
          { label: '🔓 Unprotect Sheet', value: 'unprotectSheet' },
        ],
        { default: 'read' }
      ),
      input.select(
        'source',
        'Source',
        [
          { label: 'File Path', value: 'file' },
          { label: 'Base64', value: 'base64' },
          { label: 'URL', value: 'url' },
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
      input.string('url', 'URL', {
        description: 'URL to download Excel file from',
        placeholder: 'https://example.com/file.xlsx',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save output file',
      }),
      input.select(
        'outputFormat',
        'Output Format',
        [
          { label: 'XLSX', value: 'xlsx' },
          { label: 'XLS (Legacy)', value: 'xls' },
          { label: 'CSV', value: 'csv' },
          { label: 'PDF', value: 'pdf' },
          { label: 'Base64', value: 'base64' },
        ],
        { default: 'xlsx' }
      ),
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
        description: 'Data as array of objects (with headers)',
        default: [],
      }),
      input.json('rawData', 'Raw Data', {
        description: 'Data as array of arrays (raw cells)',
        default: [],
      }),
      input.boolean('headers', 'Has Headers', {
        description: 'First row contains headers',
        default: true,
      }),
      input.json('columnDefinitions', 'Column Definitions', {
        description: 'Define column structure with types and formatting',
        default: [],
      }),
      input.string('formula', 'Formula', {
        description: 'Excel formula (e.g., =SUM(A1:A10))',
        placeholder: '=SUM(A1:A10)',
      }),
      input.json('formulas', 'Formulas', {
        description: 'Multiple formulas as [{cell: "A1", formula: "=SUM(B1:B10)"}]',
        default: [],
      }),
      input.string('cell', 'Cell', {
        description: 'Cell reference (e.g., A1)',
        placeholder: 'A1',
      }),
      input.json('cellValue', 'Cell Value', {
        description: 'Value to set in cell',
      }),
      input.json('style', 'Cell Style', {
        description: 'Cell styling options (bold, color, alignment, etc.)',
        default: {},
      }),
      input.string('mergeRange', 'Merge Range', {
        description: 'Range to merge (e.g., A1:D1)',
        placeholder: 'A1:D1',
      }),
      input.number('rowIndex', 'Row Index', {
        description: 'Row index for insert/delete operations',
      }),
      input.number('columnIndex', 'Column Index', {
        description: 'Column index for insert/delete operations',
      }),
      input.number('count', 'Count', {
        description: 'Number of rows/columns to insert/delete',
        default: 1,
      }),
      input.string('filterColumn', 'Filter Column', {
        description: 'Column to apply filter',
      }),
      input.string('sortColumn', 'Sort Column', {
        description: 'Column to sort by',
      }),
      input.select(
        'sortOrder',
        'Sort Order',
        [
          { label: 'Ascending', value: 'asc' },
          { label: 'Descending', value: 'desc' },
        ],
        { default: 'asc' }
      ),
      input.select(
        'chartType',
        'Chart Type',
        [
          { label: 'Bar Chart', value: 'bar' },
          { label: 'Line Chart', value: 'line' },
          { label: 'Pie Chart', value: 'pie' },
          { label: 'Area Chart', value: 'area' },
          { label: 'Scatter Plot', value: 'scatter' },
          { label: 'Doughnut Chart', value: 'doughnut' },
        ],
        { default: 'bar' }
      ),
      input.string('chartRange', 'Chart Data Range', {
        description: 'Data range for chart',
        placeholder: 'A1:B10',
      }),
      input.string('chartPosition', 'Chart Position', {
        description: 'Cell to place chart',
        placeholder: 'E1',
      }),
      input.text('imageBase64', 'Image Base64', {
        description: 'Image as base64 to insert',
      }),
      input.string('imagePosition', 'Image Position', {
        description: 'Cell to place image',
        placeholder: 'A1',
      }),
      input.string('password', 'Password', {
        description: 'Password for protection/unprotection',
      }),
      input.string('dateFormat', 'Date Format', {
        description: 'Format for date values',
        default: 'YYYY-MM-DD',
      }),
      input.string('numberFormat', 'Number Format', {
        description: 'Excel number format (e.g., #,##0.00)',
        placeholder: '#,##0.00',
      }),
      input.boolean('includeEmptyRows', 'Include Empty Rows', {
        description: 'Include empty rows in output',
        default: false,
      }),
      input.boolean('rawValues', 'Raw Values', {
        description: 'Return raw cell values without formatting',
        default: false,
      }),
      input.boolean('evaluateFormulas', 'Evaluate Formulas', {
        description: 'Calculate formulas when reading',
        default: true,
      }),
      input.string('newSheetName', 'New Sheet Name', {
        description: 'Name for new sheet',
      }),
      input.boolean('createIfNotExists', 'Create If Not Exists', {
        description: 'Create file if it does not exist',
        default: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('data', 'Read data as objects'),
      output.array('rawData', 'Read data as arrays'),
      output.array('headers', 'Column headers'),
      output.array('sheets', 'Sheet names'),
      output.string('path', 'Output file path'),
      output.string('base64', 'Output as base64'),
      output.number('rowCount', 'Number of rows'),
      output.number('columnCount', 'Number of columns'),
      output.unknown('cellValue', 'Cell value'),
      output.object('metadata', 'Workbook metadata'),
    ],
    defaults: {
      operation: 'read',
      source: 'file',
      outputFormat: 'xlsx',
      startRow: 1,
      startColumn: 'A',
      headers: true,
      dateFormat: 'YYYY-MM-DD',
      includeEmptyRows: false,
      rawValues: false,
      evaluateFormulas: true,
      createIfNotExists: true,
      count: 1,
      sortOrder: 'asc',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ExcelNodeSchema.parse(nodeInput.config);

    logger.info(`Excel ${config.operation} from ${config.source}`);

    // Mock data for demonstration
    const mockData = [
      { Name: 'John Doe', Email: 'john@example.com', Age: 30, Salary: 50000, HireDate: '2023-01-15' },
      { Name: 'Jane Smith', Email: 'jane@example.com', Age: 25, Salary: 45000, HireDate: '2023-03-20' },
      { Name: 'Bob Wilson', Email: 'bob@example.com', Age: 35, Salary: 60000, HireDate: '2022-06-10' },
    ];

    switch (config.operation) {
      case 'read':
      case 'getRange':
        return {
          data: {
            success: true,
            headers: ['Name', 'Email', 'Age', 'Salary', 'HireDate'],
            data: mockData,
            rawData: [
              ['Name', 'Email', 'Age', 'Salary', 'HireDate'],
              ['John Doe', 'john@example.com', 30, 50000, '2023-01-15'],
              ['Jane Smith', 'jane@example.com', 25, 45000, '2023-03-20'],
              ['Bob Wilson', 'bob@example.com', 35, 60000, '2022-06-10'],
            ],
            rowCount: 3,
            columnCount: 5,
            metadata: {
              sheetCount: 1,
              activeSheet: config.sheetName || 'Sheet1',
              created: new Date().toISOString(),
            },
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
            rowCount: config.data?.length || config.rawData?.length || 0,
            columnCount: config.data?.[0] ? Object.keys(config.data[0]).length : config.rawData?.[0]?.length || 0,
          },
        };

      case 'setFormula':
        return {
          data: {
            success: true,
            cell: config.cell,
            formula: config.formula,
            evaluatedValue: 12500, // Mock calculated value
          },
        };

      case 'setFormulas':
        return {
          data: {
            success: true,
            formulas: config.formulas?.map((f) => ({
              cell: f.cell,
              formula: f.formula,
              evaluatedValue: Math.random() * 10000,
            })),
          },
        };

      case 'calculateFormulas':
        return {
          data: {
            success: true,
            calculatedCells: [
              { cell: 'D4', formula: '=SUM(D2:D3)', value: 95000 },
              { cell: 'E4', formula: '=AVERAGE(C2:C3)', value: 30 },
            ],
          },
        };

      case 'getCellValue':
        return {
          data: {
            success: true,
            cell: config.cell,
            value: 'John Doe',
            formula: null,
            type: 'string',
          },
        };

      case 'setCellStyle':
        return {
          data: {
            success: true,
            cell: config.cell || config.range,
            style: config.style,
          },
        };

      case 'mergeCells':
        return {
          data: {
            success: true,
            mergedRange: config.mergeRange,
          },
        };

      case 'unmergeCells':
        return {
          data: {
            success: true,
            unmergedRange: config.mergeRange,
          },
        };

      case 'getSheets':
        return {
          data: {
            success: true,
            sheets: ['Sheet1', 'Data', 'Summary', 'Charts'],
            activeSheet: 'Sheet1',
          },
        };

      case 'createSheet':
        return {
          data: {
            success: true,
            sheets: ['Sheet1', 'Data', config.newSheetName],
            createdSheet: config.newSheetName,
          },
        };

      case 'deleteSheet':
        return {
          data: {
            success: true,
            deletedSheet: config.sheetName,
          },
        };

      case 'insertRows':
        return {
          data: {
            success: true,
            insertedAt: config.rowIndex,
            count: config.count,
          },
        };

      case 'insertColumns':
        return {
          data: {
            success: true,
            insertedAt: config.columnIndex,
            count: config.count,
          },
        };

      case 'deleteRows':
        return {
          data: {
            success: true,
            deletedAt: config.rowIndex,
            count: config.count,
          },
        };

      case 'deleteColumns':
        return {
          data: {
            success: true,
            deletedAt: config.columnIndex,
            count: config.count,
          },
        };

      case 'autoFilter':
        return {
          data: {
            success: true,
            range: config.range,
            filterColumn: config.filterColumn,
          },
        };

      case 'sortData':
        return {
          data: {
            success: true,
            range: config.range,
            sortColumn: config.sortColumn,
            order: config.sortOrder,
          },
        };

      case 'addChart':
        return {
          data: {
            success: true,
            chartType: config.chartType,
            dataRange: config.chartRange,
            position: config.chartPosition,
          },
        };

      case 'addImage':
        return {
          data: {
            success: true,
            position: config.imagePosition,
            imageSize: config.imageBase64?.length || 0,
          },
        };

      case 'protectSheet':
        return {
          data: {
            success: true,
            sheet: config.sheetName,
            protected: true,
          },
        };

      case 'unprotectSheet':
        return {
          data: {
            success: true,
            sheet: config.sheetName,
            protected: false,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
