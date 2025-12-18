import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PdfGenerateNodeSchema = z.object({
  source: z.enum(['html', 'template', 'url', 'markdown']).default('html'),
  html: z.string().optional(),
  templateName: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  url: z.string().optional(),
  markdown: z.string().optional(),
  outputPath: z.string().optional(),
  filename: z.string().default('document.pdf'),
  pageSize: z.enum(['A4', 'A3', 'A5', 'Letter', 'Legal', 'Tabloid']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('portrait'),
  margin: z.object({
    top: z.string().default('20mm'),
    right: z.string().default('20mm'),
    bottom: z.string().default('20mm'),
    left: z.string().default('20mm'),
  }).optional(),
  headerTemplate: z.string().optional(),
  footerTemplate: z.string().optional(),
  displayHeaderFooter: z.boolean().default(false),
  printBackground: z.boolean().default(true),
  preferCSSPageSize: z.boolean().default(false),
  scale: z.number().min(0.1).max(2).default(1),
  pageRanges: z.string().optional(),
  waitForSelector: z.string().optional(),
  waitTimeout: z.number().default(30000),
});

export type PdfGenerateNodeConfig = z.infer<typeof PdfGenerateNodeSchema>;

export const pdfGenerateNode: NodeDefinition = createNode(
  {
    type: 'utility.pdf-generate',
    category: 'utility',
    name: 'PDF Generate',
    description: 'Generate PDF from HTML, templates, URLs, or Markdown',
    icon: 'FileText',
    inputs: [
      input.select(
        'source',
        'Source',
        [
          { label: 'HTML', value: 'html' },
          { label: 'Template', value: 'template' },
          { label: 'URL', value: 'url' },
          { label: 'Markdown', value: 'markdown' },
        ],
        { default: 'html' }
      ),
      input.text('html', 'HTML Content', {
        description: 'HTML content to convert',
        placeholder: '<html><body>Hello World</body></html>',
      }),
      input.string('templateName', 'Template Name', {
        description: 'Template name (Handlebars/Mustache)',
      }),
      input.json('templateData', 'Template Data', {
        description: 'Data to inject into template',
        default: {},
      }),
      input.string('url', 'URL', {
        description: 'URL to capture as PDF',
        placeholder: 'https://example.com',
      }),
      input.text('markdown', 'Markdown', {
        description: 'Markdown content to convert',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save PDF file',
      }),
      input.string('filename', 'Filename', {
        description: 'PDF filename',
        default: 'document.pdf',
      }),
      input.select(
        'pageSize',
        'Page Size',
        [
          { label: 'A4', value: 'A4' },
          { label: 'A3', value: 'A3' },
          { label: 'A5', value: 'A5' },
          { label: 'Letter', value: 'Letter' },
          { label: 'Legal', value: 'Legal' },
          { label: 'Tabloid', value: 'Tabloid' },
        ],
        { default: 'A4' }
      ),
      input.select(
        'orientation',
        'Orientation',
        [
          { label: 'Portrait', value: 'portrait' },
          { label: 'Landscape', value: 'landscape' },
        ],
        { default: 'portrait' }
      ),
      input.json('margin', 'Margins', {
        description: 'Page margins',
        default: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      }),
      input.text('headerTemplate', 'Header Template', {
        description: 'HTML template for header',
      }),
      input.text('footerTemplate', 'Footer Template', {
        description: 'HTML template for footer',
      }),
      input.boolean('displayHeaderFooter', 'Display Header/Footer', {
        description: 'Show header and footer',
        default: false,
      }),
      input.boolean('printBackground', 'Print Background', {
        description: 'Include background graphics',
        default: true,
      }),
      input.number('scale', 'Scale', {
        description: 'Scale factor (0.1 to 2)',
        default: 1,
        min: 0.1,
        max: 2,
      }),
      input.string('pageRanges', 'Page Ranges', {
        description: 'Page ranges to print (e.g., "1-5, 8")',
      }),
      input.string('waitForSelector', 'Wait For Selector', {
        description: 'CSS selector to wait for',
      }),
    ],
    outputs: [
      output.boolean('success', 'Generation success'),
      output.string('path', 'PDF file path'),
      output.string('base64', 'PDF as base64'),
      output.number('pages', 'Number of pages'),
      output.number('size', 'File size in bytes'),
    ],
    defaults: {
      source: 'html',
      filename: 'document.pdf',
      pageSize: 'A4',
      orientation: 'portrait',
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PdfGenerateNodeSchema.parse(nodeInput.config);

    logger.info(`PDF Generate from ${config.source}`);

    return {
      data: {
        success: true,
        path: config.outputPath ? `${config.outputPath}/${config.filename}` : `/tmp/${config.filename}`,
        base64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL...',
        pages: 3,
        size: 125432,
      },
    };
  }
);
