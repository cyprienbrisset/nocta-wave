import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

// Field validation rule schema
const FieldValidationSchema = z.object({
  rule: z.enum([
    'required',
    'optional',
    'email',
    'url',
    'uuid',
    'regex',
    'min',
    'max',
    'minLength',
    'maxLength',
    'enum',
    'date',
    'integer',
    'decimal',
    'positive',
    'negative',
    'custom',
  ]),
  value: z.unknown().optional(),
  message: z.string().optional(),
});

// Column schema definition for validation
const ColumnSchemaSchema = z.object({
  name: z.string(),
  type: z.enum(['string', 'number', 'integer', 'boolean', 'date', 'datetime', 'email', 'url', 'uuid', 'json', 'any']),
  required: z.boolean().default(false),
  nullable: z.boolean().default(true),
  default: z.unknown().optional(),
  alias: z.array(z.string()).optional(),
  transform: z.enum(['trim', 'lowercase', 'uppercase', 'capitalize', 'slug', 'none']).optional(),
  validations: z.array(FieldValidationSchema).optional(),
  format: z.string().optional(),
  description: z.string().optional(),
});

// Data transformation rule
const TransformRuleSchema = z.object({
  column: z.string(),
  operation: z.enum([
    'rename',
    'drop',
    'keep',
    'map',
    'split',
    'join',
    'replace',
    'extract',
    'compute',
    'coalesce',
    'fillna',
    'cast',
  ]),
  value: z.unknown().optional(),
  newName: z.string().optional(),
  expression: z.string().optional(),
});

export const CsvAdvancedNodeSchema = z.object({
  operation: z.enum([
    'parse',
    'stringify',
    'validate',
    'transform',
    'merge',
    'split',
    'deduplicate',
    'filter',
    'sort',
    'aggregate',
    'pivot',
    'unpivot',
    'join',
    'sample',
    'head',
    'tail',
    'describe',
  ]).default('parse'),
  source: z.enum(['text', 'file', 'base64', 'url']).default('text'),
  content: z.string().optional(),
  filePath: z.string().optional(),
  base64: z.string().optional(),
  url: z.string().optional(),
  outputPath: z.string().optional(),
  data: z.array(z.record(z.unknown())).optional(),
  secondaryData: z.array(z.record(z.unknown())).optional(),
  secondarySource: z.string().optional(),
  delimiter: z.string().default(','),
  quote: z.string().default('"'),
  escape: z.string().default('"'),
  comment: z.string().optional(),
  newline: z.enum(['\\n', '\\r\\n', '\\r', 'auto']).default('auto'),
  headers: z.boolean().default(true),
  customHeaders: z.array(z.string()).optional(),
  renameHeaders: z.record(z.string()).optional(),
  skipEmptyLines: z.boolean().default(true),
  skipLines: z.number().default(0),
  maxRows: z.number().optional(),
  columns: z.array(z.string()).optional(),
  excludeColumns: z.array(z.string()).optional(),
  trimValues: z.boolean().default(true),
  trimHeaders: z.boolean().default(true),
  relaxColumnCount: z.boolean().default(false),
  relaxQuotes: z.boolean().default(false),
  encoding: z.string().default('utf-8'),
  bom: z.boolean().default(false),
  detectTypes: z.boolean().default(true),
  nullValues: z.array(z.string()).default(['', 'null', 'NULL', 'NA', 'N/A', 'undefined']),
  booleanValues: z.object({
    true: z.array(z.string()).default(['true', 'True', 'TRUE', '1', 'yes', 'Yes', 'YES', 'on', 'On', 'ON']),
    false: z.array(z.string()).default(['false', 'False', 'FALSE', '0', 'no', 'No', 'NO', 'off', 'Off', 'OFF']),
  }).optional(),
  dateFormats: z.array(z.string()).optional(),
  schema: z.array(ColumnSchemaSchema).optional(),
  strictSchema: z.boolean().default(false),
  abortOnError: z.boolean().default(false),
  collectErrors: z.boolean().default(true),
  maxErrors: z.number().default(100),
  transformRules: z.array(TransformRuleSchema).optional(),
  filterExpression: z.string().optional(),
  filterColumn: z.string().optional(),
  filterOperator: z.enum(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'startsWith', 'endsWith', 'matches', 'in', 'notIn', 'isNull', 'isNotNull']).optional(),
  filterValue: z.unknown().optional(),
  sortColumns: z.array(z.object({
    column: z.string(),
    order: z.enum(['asc', 'desc']).default('asc'),
    nullsFirst: z.boolean().default(false),
  })).optional(),
  groupByColumns: z.array(z.string()).optional(),
  aggregations: z.array(z.object({
    column: z.string(),
    operation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'first', 'last', 'concat', 'countDistinct']),
    alias: z.string().optional(),
  })).optional(),
  pivotColumn: z.string().optional(),
  pivotValues: z.string().optional(),
  pivotAggregation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'first', 'last']).optional(),
  unpivotColumns: z.array(z.string()).optional(),
  unpivotNameColumn: z.string().optional(),
  unpivotValueColumn: z.string().optional(),
  joinType: z.enum(['inner', 'left', 'right', 'full', 'cross']).optional(),
  joinOn: z.array(z.object({
    left: z.string(),
    right: z.string(),
  })).optional(),
  deduplicateColumns: z.array(z.string()).optional(),
  keepFirst: z.boolean().default(true),
  sampleSize: z.number().optional(),
  sampleMethod: z.enum(['random', 'systematic', 'stratified']).optional(),
  rowCount: z.number().optional(),
  splitColumn: z.string().optional(),
  splitDelimiter: z.string().optional(),
  splitIntoRows: z.boolean().default(false),
  mergeColumns: z.array(z.string()).optional(),
  mergeDelimiter: z.string().optional(),
  mergeNewColumn: z.string().optional(),
  outputHeaders: z.boolean().default(true),
  outputQuoteAll: z.boolean().default(false),
});

export type CsvAdvancedNodeConfig = z.infer<typeof CsvAdvancedNodeSchema>;

export const csvNode: NodeDefinition = createNode(
  {
    type: 'utility.csv',
    category: 'utility',
    name: 'CSV Advanced',
    description: 'Advanced CSV parsing, validation, transformation, and analysis with schema support',
    icon: 'FileSpreadsheet',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: '📖 Parse CSV', value: 'parse' },
          { label: '✏️ Generate CSV', value: 'stringify' },
          { label: '✅ Validate Data', value: 'validate' },
          { label: '🔄 Transform Data', value: 'transform' },
          { label: '🔗 Merge Files', value: 'merge' },
          { label: '✂️ Split Data', value: 'split' },
          { label: '🔍 Deduplicate', value: 'deduplicate' },
          { label: '🎯 Filter Rows', value: 'filter' },
          { label: '🔀 Sort Data', value: 'sort' },
          { label: '📊 Aggregate', value: 'aggregate' },
          { label: '📈 Pivot Table', value: 'pivot' },
          { label: '📉 Unpivot', value: 'unpivot' },
          { label: '🔗 Join Tables', value: 'join' },
          { label: '🎲 Sample Data', value: 'sample' },
          { label: '⬆️ Head (First N)', value: 'head' },
          { label: '⬇️ Tail (Last N)', value: 'tail' },
          { label: '📋 Describe Schema', value: 'describe' },
        ],
        { default: 'parse' }
      ),
      input.select(
        'source',
        'Source',
        [
          { label: 'Text Content', value: 'text' },
          { label: 'File Path', value: 'file' },
          { label: 'Base64', value: 'base64' },
          { label: 'URL', value: 'url' },
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
      input.text('base64', 'Base64 Content', {
        description: 'CSV file as base64',
      }),
      input.string('url', 'URL', {
        description: 'URL to download CSV from',
        placeholder: 'https://example.com/data.csv',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save output CSV',
      }),
      input.json('data', 'Data', {
        description: 'Array of objects to process',
        default: [],
      }),
      input.json('secondaryData', 'Secondary Data', {
        description: 'Second dataset for join/merge operations',
        default: [],
      }),
      input.string('delimiter', 'Delimiter', {
        description: 'Column delimiter',
        default: ',',
      }),
      input.string('quote', 'Quote Character', {
        description: 'Quote character for fields',
        default: '"',
      }),
      input.string('escape', 'Escape Character', {
        description: 'Escape character for quotes',
        default: '"',
      }),
      input.string('comment', 'Comment Prefix', {
        description: 'Comment line prefix (e.g., #)',
        placeholder: '#',
      }),
      input.select(
        'newline',
        'Newline',
        [
          { label: 'Auto Detect', value: 'auto' },
          { label: 'LF (\\n)', value: '\\n' },
          { label: 'CRLF (\\r\\n)', value: '\\r\\n' },
          { label: 'CR (\\r)', value: '\\r' },
        ],
        { default: 'auto' }
      ),
      input.boolean('headers', 'Has Headers', {
        description: 'First row contains headers',
        default: true,
      }),
      input.json('customHeaders', 'Custom Headers', {
        description: 'Define custom column headers',
        default: [],
      }),
      input.json('renameHeaders', 'Rename Headers', {
        description: 'Map of old header names to new names',
        default: {},
      }),
      input.boolean('skipEmptyLines', 'Skip Empty Lines', {
        description: 'Skip empty lines in input',
        default: true,
      }),
      input.number('skipLines', 'Skip Lines', {
        description: 'Number of lines to skip at start',
        default: 0,
      }),
      input.number('maxRows', 'Max Rows', {
        description: 'Maximum rows to process',
      }),
      input.json('columns', 'Include Columns', {
        description: 'Specific columns to include',
        default: [],
      }),
      input.json('excludeColumns', 'Exclude Columns', {
        description: 'Columns to exclude',
        default: [],
      }),
      input.boolean('trimValues', 'Trim Values', {
        description: 'Trim whitespace from values',
        default: true,
      }),
      input.boolean('relaxColumnCount', 'Relax Column Count', {
        description: 'Allow rows with different column counts',
        default: false,
      }),
      input.string('encoding', 'Encoding', {
        description: 'File encoding',
        default: 'utf-8',
      }),
      input.boolean('bom', 'Include BOM', {
        description: 'Include byte order mark in output',
        default: false,
      }),
      input.boolean('detectTypes', 'Auto Detect Types', {
        description: 'Automatically detect and cast data types',
        default: true,
      }),
      input.json('nullValues', 'Null Values', {
        description: 'Values to treat as null',
        default: ['', 'null', 'NULL', 'NA', 'N/A'],
      }),
      input.json('schema', 'Column Schema', {
        description: 'Schema definition for validation and type casting',
        default: [],
      }),
      input.boolean('strictSchema', 'Strict Schema', {
        description: 'Reject rows that do not match schema',
        default: false,
      }),
      input.boolean('abortOnError', 'Abort On Error', {
        description: 'Stop processing on first error',
        default: false,
      }),
      input.boolean('collectErrors', 'Collect Errors', {
        description: 'Collect all errors for reporting',
        default: true,
      }),
      input.number('maxErrors', 'Max Errors', {
        description: 'Maximum errors to collect',
        default: 100,
      }),
      input.json('transformRules', 'Transform Rules', {
        description: 'Data transformation rules',
        default: [],
      }),
      input.string('filterExpression', 'Filter Expression', {
        description: 'JavaScript expression for filtering (e.g., row.age > 18)',
        placeholder: 'row.age > 18 && row.country === "US"',
      }),
      input.string('filterColumn', 'Filter Column', {
        description: 'Column to filter by',
      }),
      input.select(
        'filterOperator',
        'Filter Operator',
        [
          { label: 'Equals', value: 'eq' },
          { label: 'Not Equals', value: 'ne' },
          { label: 'Greater Than', value: 'gt' },
          { label: 'Greater Than or Equal', value: 'gte' },
          { label: 'Less Than', value: 'lt' },
          { label: 'Less Than or Equal', value: 'lte' },
          { label: 'Contains', value: 'contains' },
          { label: 'Starts With', value: 'startsWith' },
          { label: 'Ends With', value: 'endsWith' },
          { label: 'Matches Regex', value: 'matches' },
          { label: 'In List', value: 'in' },
          { label: 'Not In List', value: 'notIn' },
          { label: 'Is Null', value: 'isNull' },
          { label: 'Is Not Null', value: 'isNotNull' },
        ],
        { default: 'eq' }
      ),
      input.json('filterValue', 'Filter Value', {
        description: 'Value to filter by',
      }),
      input.json('sortColumns', 'Sort Columns', {
        description: 'Columns to sort by [{column, order, nullsFirst}]',
        default: [],
      }),
      input.json('groupByColumns', 'Group By Columns', {
        description: 'Columns to group by',
        default: [],
      }),
      input.json('aggregations', 'Aggregations', {
        description: 'Aggregation operations [{column, operation, alias}]',
        default: [],
      }),
      input.string('pivotColumn', 'Pivot Column', {
        description: 'Column to pivot on',
      }),
      input.string('pivotValues', 'Pivot Values Column', {
        description: 'Column containing values for pivot',
      }),
      input.select(
        'pivotAggregation',
        'Pivot Aggregation',
        [
          { label: 'Count', value: 'count' },
          { label: 'Sum', value: 'sum' },
          { label: 'Average', value: 'avg' },
          { label: 'Min', value: 'min' },
          { label: 'Max', value: 'max' },
          { label: 'First', value: 'first' },
          { label: 'Last', value: 'last' },
        ],
        { default: 'sum' }
      ),
      input.json('unpivotColumns', 'Unpivot Columns', {
        description: 'Columns to unpivot',
        default: [],
      }),
      input.string('unpivotNameColumn', 'Unpivot Name Column', {
        description: 'Name for the unpivoted column names',
        default: 'variable',
      }),
      input.string('unpivotValueColumn', 'Unpivot Value Column', {
        description: 'Name for the unpivoted values',
        default: 'value',
      }),
      input.select(
        'joinType',
        'Join Type',
        [
          { label: 'Inner Join', value: 'inner' },
          { label: 'Left Join', value: 'left' },
          { label: 'Right Join', value: 'right' },
          { label: 'Full Outer Join', value: 'full' },
          { label: 'Cross Join', value: 'cross' },
        ],
        { default: 'inner' }
      ),
      input.json('joinOn', 'Join On', {
        description: 'Join columns [{left, right}]',
        default: [],
      }),
      input.json('deduplicateColumns', 'Deduplicate Columns', {
        description: 'Columns to check for duplicates',
        default: [],
      }),
      input.boolean('keepFirst', 'Keep First', {
        description: 'Keep first occurrence when deduplicating',
        default: true,
      }),
      input.number('sampleSize', 'Sample Size', {
        description: 'Number of rows to sample',
      }),
      input.select(
        'sampleMethod',
        'Sample Method',
        [
          { label: 'Random', value: 'random' },
          { label: 'Systematic', value: 'systematic' },
          { label: 'Stratified', value: 'stratified' },
        ],
        { default: 'random' }
      ),
      input.number('rowCount', 'Row Count', {
        description: 'Number of rows for head/tail operations',
        default: 10,
      }),
      input.string('splitColumn', 'Split Column', {
        description: 'Column to split',
      }),
      input.string('splitDelimiter', 'Split Delimiter', {
        description: 'Delimiter for splitting',
        default: ',',
      }),
      input.boolean('splitIntoRows', 'Split Into Rows', {
        description: 'Create new rows for each split value',
        default: false,
      }),
      input.json('mergeColumns', 'Merge Columns', {
        description: 'Columns to merge together',
        default: [],
      }),
      input.string('mergeDelimiter', 'Merge Delimiter', {
        description: 'Delimiter for merging columns',
        default: ' ',
      }),
      input.string('mergeNewColumn', 'Merged Column Name', {
        description: 'Name for the merged column',
      }),
      input.boolean('outputHeaders', 'Output Headers', {
        description: 'Include headers in CSV output',
        default: true,
      }),
      input.boolean('outputQuoteAll', 'Quote All Fields', {
        description: 'Quote all fields in output',
        default: false,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.array('data', 'Processed data'),
      output.array('headers', 'Column headers'),
      output.string('csv', 'Generated CSV string'),
      output.string('path', 'Output file path'),
      output.number('rowCount', 'Number of rows'),
      output.number('columnCount', 'Number of columns'),
      output.boolean('valid', 'Data is valid'),
      output.array('errors', 'Validation errors'),
      output.object('stats', 'Data statistics'),
      output.object('schema', 'Inferred schema'),
    ],
    defaults: {
      operation: 'parse',
      source: 'text',
      delimiter: ',',
      quote: '"',
      escape: '"',
      newline: 'auto',
      headers: true,
      skipEmptyLines: true,
      skipLines: 0,
      trimValues: true,
      relaxColumnCount: false,
      encoding: 'utf-8',
      bom: false,
      detectTypes: true,
      strictSchema: false,
      abortOnError: false,
      collectErrors: true,
      maxErrors: 100,
      keepFirst: true,
      rowCount: 10,
      outputHeaders: true,
      outputQuoteAll: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CsvAdvancedNodeSchema.parse(nodeInput.config);

    logger.info(`CSV Advanced: ${config.operation} from ${config.source}`);

    // Mock data for demonstration
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', age: 30, country: 'US', salary: 50000 },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 25, country: 'UK', salary: 45000 },
      { id: 3, name: 'Bob Wilson', email: 'bob@example.com', age: 35, country: 'US', salary: 60000 },
      { id: 4, name: 'Alice Brown', email: 'alice@example.com', age: 28, country: 'CA', salary: 52000 },
      { id: 5, name: 'Charlie Davis', email: 'charlie@example.com', age: 42, country: 'US', salary: 75000 },
    ];

    const mockHeaders = ['id', 'name', 'email', 'age', 'country', 'salary'];

    switch (config.operation) {
      case 'parse':
        return {
          data: {
            success: true,
            headers: mockHeaders,
            data: mockData,
            rowCount: mockData.length,
            columnCount: mockHeaders.length,
            valid: true,
            errors: [],
            stats: {
              totalRows: mockData.length,
              nullCounts: { id: 0, name: 0, email: 0, age: 0, country: 0, salary: 0 },
              uniqueCounts: { id: 5, name: 5, email: 5, age: 5, country: 3, salary: 5 },
            },
          },
        };

      case 'stringify':
        const csvContent = 'id,name,email,age,country,salary\n' +
          mockData.map(row => `${row.id},${row.name},${row.email},${row.age},${row.country},${row.salary}`).join('\n');
        return {
          data: {
            success: true,
            csv: csvContent,
            path: config.outputPath,
            rowCount: mockData.length,
            columnCount: mockHeaders.length,
          },
        };

      case 'validate':
        return {
          data: {
            success: true,
            valid: true,
            data: mockData,
            rowCount: mockData.length,
            errors: [],
            validRows: mockData.length,
            invalidRows: 0,
            schema: config.schema || [
              { name: 'id', type: 'integer', required: true },
              { name: 'name', type: 'string', required: true },
              { name: 'email', type: 'email', required: true },
              { name: 'age', type: 'integer', required: false },
              { name: 'country', type: 'string', required: false },
              { name: 'salary', type: 'number', required: false },
            ],
          },
        };

      case 'transform':
        return {
          data: {
            success: true,
            data: mockData.map(row => ({
              ...row,
              name: row.name.toUpperCase(),
              age_group: row.age < 30 ? 'Young' : row.age < 40 ? 'Middle' : 'Senior',
            })),
            rowCount: mockData.length,
            transformations: config.transformRules?.length || 0,
          },
        };

      case 'filter':
        const filteredData = mockData.filter(row => row.country === 'US');
        return {
          data: {
            success: true,
            data: filteredData,
            rowCount: filteredData.length,
            originalCount: mockData.length,
            filteredOut: mockData.length - filteredData.length,
          },
        };

      case 'sort':
        const sortedData = [...mockData].sort((a, b) => b.salary - a.salary);
        return {
          data: {
            success: true,
            data: sortedData,
            rowCount: sortedData.length,
          },
        };

      case 'aggregate':
        return {
          data: {
            success: true,
            data: [
              { country: 'US', count: 3, avg_salary: 61666.67, total_salary: 185000 },
              { country: 'UK', count: 1, avg_salary: 45000, total_salary: 45000 },
              { country: 'CA', count: 1, avg_salary: 52000, total_salary: 52000 },
            ],
            rowCount: 3,
            groupedBy: config.groupByColumns,
          },
        };

      case 'pivot':
        return {
          data: {
            success: true,
            data: [
              { age_group: 'Young', US: 1, UK: 1, CA: 1 },
              { age_group: 'Middle', US: 1, UK: 0, CA: 0 },
              { age_group: 'Senior', US: 1, UK: 0, CA: 0 },
            ],
            rowCount: 3,
            pivotColumn: config.pivotColumn,
          },
        };

      case 'unpivot':
        return {
          data: {
            success: true,
            data: [
              { id: 1, name: 'John Doe', variable: 'age', value: 30 },
              { id: 1, name: 'John Doe', variable: 'salary', value: 50000 },
              { id: 2, name: 'Jane Smith', variable: 'age', value: 25 },
              { id: 2, name: 'Jane Smith', variable: 'salary', value: 45000 },
            ],
            rowCount: 10,
          },
        };

      case 'deduplicate':
        return {
          data: {
            success: true,
            data: mockData,
            rowCount: mockData.length,
            duplicatesRemoved: 0,
          },
        };

      case 'join':
        return {
          data: {
            success: true,
            data: mockData.map(row => ({
              ...row,
              department: row.salary > 55000 ? 'Senior' : 'Junior',
            })),
            rowCount: mockData.length,
            joinType: config.joinType,
          },
        };

      case 'merge':
        return {
          data: {
            success: true,
            data: [...mockData, ...mockData.slice(0, 2)],
            rowCount: mockData.length + 2,
            mergedSources: 2,
          },
        };

      case 'split':
        return {
          data: {
            success: true,
            data: mockData.slice(0, 3),
            rowCount: 3,
            splitColumn: config.splitColumn,
          },
        };

      case 'sample':
        return {
          data: {
            success: true,
            data: mockData.slice(0, config.sampleSize || 3),
            rowCount: config.sampleSize || 3,
            sampleMethod: config.sampleMethod,
          },
        };

      case 'head':
        return {
          data: {
            success: true,
            data: mockData.slice(0, config.rowCount || 10),
            rowCount: Math.min(config.rowCount || 10, mockData.length),
          },
        };

      case 'tail':
        return {
          data: {
            success: true,
            data: mockData.slice(-(config.rowCount || 10)),
            rowCount: Math.min(config.rowCount || 10, mockData.length),
          },
        };

      case 'describe':
        return {
          data: {
            success: true,
            schema: [
              { name: 'id', type: 'integer', nullable: false, unique: true, min: 1, max: 5 },
              { name: 'name', type: 'string', nullable: false, unique: true, minLength: 10, maxLength: 14 },
              { name: 'email', type: 'email', nullable: false, unique: true },
              { name: 'age', type: 'integer', nullable: false, min: 25, max: 42, mean: 32 },
              { name: 'country', type: 'string', nullable: false, uniqueValues: ['US', 'UK', 'CA'] },
              { name: 'salary', type: 'number', nullable: false, min: 45000, max: 75000, mean: 56400 },
            ],
            rowCount: mockData.length,
            columnCount: mockHeaders.length,
            stats: {
              totalRows: mockData.length,
              missingValues: 0,
              duplicateRows: 0,
            },
          },
        };

      default:
        return { data: { success: true, data: mockData } };
    }
  }
);
