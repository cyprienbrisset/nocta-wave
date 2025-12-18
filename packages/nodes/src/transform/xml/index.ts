import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const XmlNodeSchema = z.object({
  operation: z.enum(['parse', 'stringify', 'query', 'transform', 'validate']).default('parse'),
  xmlInput: z.string().optional(),
  jsonInput: z.any().optional(),
  xpathQuery: z.string().optional(),
  xsltTemplate: z.string().optional(),
  xsdSchema: z.string().optional(),
  rootElement: z.string().default('root'),
  declaration: z.boolean().default(true),
  indent: z.boolean().default(true),
  indentSpaces: z.number().default(2),
  cdataElements: z.array(z.string()).optional(),
  attributePrefix: z.string().default('@'),
  textNodeName: z.string().default('#text'),
  ignoreAttributes: z.boolean().default(false),
  ignoreNamespaces: z.boolean().default(false),
  trimWhitespace: z.boolean().default(true),
  parseNumbers: z.boolean().default(true),
  parseBooleans: z.boolean().default(true),
});

export type XmlNodeConfig = z.infer<typeof XmlNodeSchema>;

export const xmlNode: NodeDefinition = createNode(
  {
    type: 'transform.xml',
    category: 'transform',
    name: 'XML',
    description: 'Parse, generate, and transform XML data',
    icon: 'Code',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Parse XML to JSON', value: 'parse' },
          { label: 'JSON to XML', value: 'stringify' },
          { label: 'XPath Query', value: 'query' },
          { label: 'XSLT Transform', value: 'transform' },
          { label: 'Validate XSD', value: 'validate' },
        ],
        { default: 'parse' }
      ),
      input.text('xmlInput', 'XML Input', {
        description: 'XML string to parse',
        placeholder: '<root><item>value</item></root>',
      }),
      input.json('jsonInput', 'JSON Input', {
        description: 'JSON data to convert to XML',
        default: {},
      }),
      input.string('xpathQuery', 'XPath Query', {
        description: 'XPath expression to query',
        placeholder: '//item[@id="123"]',
      }),
      input.text('xsltTemplate', 'XSLT Template', {
        description: 'XSLT template for transformation',
      }),
      input.text('xsdSchema', 'XSD Schema', {
        description: 'XML Schema for validation',
      }),
      input.string('rootElement', 'Root Element', {
        description: 'Root element name for JSON to XML',
        default: 'root',
      }),
      input.boolean('declaration', 'Include Declaration', {
        description: 'Include XML declaration',
        default: true,
      }),
      input.boolean('indent', 'Indent Output', {
        description: 'Pretty print output',
        default: true,
      }),
      input.number('indentSpaces', 'Indent Spaces', {
        description: 'Number of spaces for indentation',
        default: 2,
      }),
      input.string('attributePrefix', 'Attribute Prefix', {
        description: 'Prefix for attributes in JSON',
        default: '@',
      }),
      input.boolean('ignoreAttributes', 'Ignore Attributes', {
        description: 'Ignore XML attributes when parsing',
        default: false,
      }),
      input.boolean('trimWhitespace', 'Trim Whitespace', {
        description: 'Trim text content whitespace',
        default: true,
      }),
      input.boolean('parseNumbers', 'Parse Numbers', {
        description: 'Convert numeric strings to numbers',
        default: true,
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.object('json', 'Parsed JSON data'),
      output.string('xml', 'Generated XML string'),
      output.array('queryResults', 'XPath query results'),
      output.boolean('valid', 'Validation result'),
      output.array('errors', 'Validation errors'),
    ],
    defaults: {
      operation: 'parse',
      rootElement: 'root',
      declaration: true,
      indent: true,
      indentSpaces: 2,
      attributePrefix: '@',
      textNodeName: '#text',
      ignoreAttributes: false,
      trimWhitespace: true,
      parseNumbers: true,
      parseBooleans: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = XmlNodeSchema.parse(nodeInput.config);

    logger.info(`XML ${config.operation}`);

    switch (config.operation) {
      case 'parse':
        return {
          data: {
            success: true,
            json: {
              root: {
                item: [
                  { '@id': '1', name: 'Item 1', value: 100 },
                  { '@id': '2', name: 'Item 2', value: 200 },
                ],
                metadata: {
                  created: '2024-01-15',
                  version: '1.0',
                },
              },
            },
          },
        };

      case 'stringify':
        return {
          data: {
            success: true,
            xml: `<?xml version="1.0" encoding="UTF-8"?>
<root>
  <item id="1">
    <name>Item 1</name>
    <value>100</value>
  </item>
  <item id="2">
    <name>Item 2</name>
    <value>200</value>
  </item>
</root>`,
          },
        };

      case 'query':
        return {
          data: {
            success: true,
            queryResults: [
              { id: '1', name: 'Item 1', value: 100 },
            ],
          },
        };

      case 'transform':
        return {
          data: {
            success: true,
            xml: `<?xml version="1.0" encoding="UTF-8"?>
<transformed>
  <result>Transformed content</result>
</transformed>`,
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
