import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const NotionSchema = z.object({
  operation: z.enum(['createPage', 'getPage', 'updatePage', 'queryDatabase', 'createDatabase']).default('queryDatabase'),
  databaseId: z.string().optional(),
  pageId: z.string().optional(),
  properties: z.record(z.unknown()).optional(),
  content: z.array(z.record(z.unknown())).optional(),
  filter: z.record(z.unknown()).optional(),
  sorts: z.array(z.record(z.unknown())).optional(),
});

export const notionNode: NodeDefinition = createNode(
  {
    type: 'integration.notion',
    category: 'integration',
    name: 'Notion',
    description: 'Create and manage Notion pages and databases',
    icon: 'FileText',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Create Page', value: 'createPage' },
        { label: 'Get Page', value: 'getPage' },
        { label: 'Update Page', value: 'updatePage' },
        { label: 'Query Database', value: 'queryDatabase' },
        { label: 'Create Database', value: 'createDatabase' },
      ], { default: 'queryDatabase' }),
      input.string('databaseId', 'Database ID', { description: 'Notion database ID' }),
      input.string('pageId', 'Page ID', { description: 'Notion page ID' }),
      input.json('properties', 'Properties', { description: 'Page properties' }),
      input.json('content', 'Content', { description: 'Page content blocks' }),
      input.json('filter', 'Filter', { description: 'Database query filter' }),
      input.json('sorts', 'Sorts', { description: 'Sort configuration' }),
    ],
    outputs: [output.object('result', 'Notion API response'), output.array('results', 'Query results')],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const config = NotionSchema.parse(nodeInput.config);
    context.logger.info(`Notion: ${config.operation}`);
    // Implementation would use Notion API
    return { data: { result: {}, results: [], __needsExecution: true } };
  }
);
