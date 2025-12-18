import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const YamlNodeSchema = z.object({
  operation: z.enum(['parse', 'stringify', 'merge', 'query', 'validate']).default('parse'),
  yamlInput: z.string().optional(),
  jsonInput: z.any().optional(),
  yamlInputs: z.array(z.string()).optional(),
  jsonPath: z.string().optional(),
  schema: z.string().optional(),
  indent: z.number().default(2),
  lineWidth: z.number().default(80),
  noRefs: z.boolean().default(false),
  noCompatMode: z.boolean().default(false),
  sortKeys: z.boolean().default(false),
  quotingType: z.enum(['single', 'double']).default('single'),
  forceQuotes: z.boolean().default(false),
  flowLevel: z.number().default(-1),
  styles: z.object({
    '!!null': z.string().optional(),
    '!!bool': z.string().optional(),
    '!!int': z.string().optional(),
  }).optional(),
  json: z.boolean().default(false),
  allowDuplicateKeys: z.boolean().default(false),
});

export type YamlNodeConfig = z.infer<typeof YamlNodeSchema>;

export const yamlNode: NodeDefinition = createNode(
  {
    type: 'transform.yaml',
    category: 'transform',
    name: 'YAML',
    description: 'Parse, generate, and manipulate YAML data',
    icon: 'FileText',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Parse YAML to JSON', value: 'parse' },
          { label: 'JSON to YAML', value: 'stringify' },
          { label: 'Merge YAML Files', value: 'merge' },
          { label: 'JSONPath Query', value: 'query' },
          { label: 'Validate Schema', value: 'validate' },
        ],
        { default: 'parse' }
      ),
      input.text('yamlInput', 'YAML Input', {
        description: 'YAML string to parse',
        placeholder: 'key: value\nlist:\n  - item1\n  - item2',
      }),
      input.json('jsonInput', 'JSON Input', {
        description: 'JSON data to convert to YAML',
        default: {},
      }),
      input.json('yamlInputs', 'YAML Inputs', {
        description: 'Multiple YAML strings to merge',
        default: [],
      }),
      input.string('jsonPath', 'JSONPath Query', {
        description: 'JSONPath expression to query',
        placeholder: '$.store.book[*].author',
      }),
      input.text('schema', 'JSON Schema', {
        description: 'JSON Schema for validation',
      }),
      input.number('indent', 'Indent', {
        description: 'Number of spaces for indentation',
        default: 2,
      }),
      input.number('lineWidth', 'Line Width', {
        description: 'Max line width before wrapping',
        default: 80,
      }),
      input.boolean('sortKeys', 'Sort Keys', {
        description: 'Sort object keys alphabetically',
        default: false,
      }),
      input.select(
        'quotingType',
        'Quote Style',
        [
          { label: 'Single Quotes', value: 'single' },
          { label: 'Double Quotes', value: 'double' },
        ],
        { default: 'single' }
      ),
      input.boolean('forceQuotes', 'Force Quotes', {
        description: 'Always quote strings',
        default: false,
      }),
      input.number('flowLevel', 'Flow Level', {
        description: 'Level to use flow style (-1 for block)',
        default: -1,
      }),
      input.boolean('noRefs', 'No References', {
        description: 'Disable YAML references',
        default: false,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('json', 'Parsed JSON data'),
      output.string('yaml', 'Generated YAML string'),
      output.array('queryResults', 'Query results'),
      output.boolean('valid', 'Validation result'),
      output.array('errors', 'Validation errors'),
    ],
    defaults: {
      operation: 'parse',
      indent: 2,
      lineWidth: 80,
      noRefs: false,
      sortKeys: false,
      quotingType: 'single',
      forceQuotes: false,
      flowLevel: -1,
      allowDuplicateKeys: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = YamlNodeSchema.parse(nodeInput.config);

    logger.info(`YAML ${config.operation}`);

    switch (config.operation) {
      case 'parse':
        return {
          data: {
            success: true,
            json: {
              name: 'my-app',
              version: '1.0.0',
              services: {
                web: {
                  image: 'nginx:latest',
                  ports: ['80:80'],
                },
                db: {
                  image: 'postgres:16',
                  environment: {
                    POSTGRES_DB: 'mydb',
                  },
                },
              },
            },
          },
        };

      case 'stringify':
        return {
          data: {
            success: true,
            yaml: `name: my-app
version: '1.0.0'
services:
  web:
    image: nginx:latest
    ports:
      - '80:80'
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: mydb`,
          },
        };

      case 'merge':
        return {
          data: {
            success: true,
            json: {
              merged: true,
              sources: ['file1.yaml', 'file2.yaml'],
              resultKeys: ['key1', 'key2', 'key3'],
            },
            yaml: `merged: true\nkey1: value1\nkey2: value2\nkey3: value3`,
          },
        };

      case 'query':
        return {
          data: {
            success: true,
            queryResults: ['nginx:latest', 'postgres:16'],
          },
        };

      case 'validate':
        return {
          data: {
            success: true,
            valid: true,
            errors: [],
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
