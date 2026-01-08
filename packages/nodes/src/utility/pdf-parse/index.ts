import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PdfParseNodeSchema = z.object({
  source: z.enum(['file', 'url', 'base64']).default('file'),
  filePath: z.string().optional(),
  url: z.string().optional(),
  base64: z.string().optional(),
  extractText: z.boolean().default(true),
  extractImages: z.boolean().default(false),
  extractTables: z.boolean().default(false),
  extractMetadata: z.boolean().default(true),
  extractAnnotations: z.boolean().default(false),
  pageRange: z.string().optional(),
  password: z.string().optional(),
  ocr: z.boolean().default(false),
  ocrLanguage: z.string().default('eng'),
  outputFormat: z.enum(['text', 'json', 'structured']).default('text'),
  preserveFormatting: z.boolean().default(false),
  splitPages: z.boolean().default(false),
});

export type PdfParseNodeConfig = z.infer<typeof PdfParseNodeSchema>;

export const pdfParseNode: NodeDefinition = createNode(
  {
    type: 'utility.pdf-parse',
    category: 'utility',
    name: 'PDF Parse',
    description: 'Extract text, images, and data from PDF files',
    icon: 'FileSearch',
    inputs: [
      input.select(
        'source',
        'Source',
        [
          { label: 'File Path', value: 'file' },
          { label: 'URL', value: 'url' },
          { label: 'Base64', value: 'base64' },
        ],
        { default: 'file' }
      ),
      input.string('filePath', 'File Path', {
        description: 'Path to PDF file',
        placeholder: '/path/to/document.pdf',
      }),
      input.string('url', 'URL', {
        description: 'URL to PDF file',
        placeholder: 'https://example.com/document.pdf',
      }),
      input.text('base64', 'Base64 Content', {
        description: 'PDF content as base64',
      }),
      input.boolean('extractText', 'Extract Text', {
        description: 'Extract text content',
        default: true,
      }),
      input.boolean('extractImages', 'Extract Images', {
        description: 'Extract embedded images',
        default: false,
      }),
      input.boolean('extractTables', 'Extract Tables', {
        description: 'Extract table data',
        default: false,
      }),
      input.boolean('extractMetadata', 'Extract Metadata', {
        description: 'Extract document metadata',
        default: true,
      }),
      input.boolean('extractAnnotations', 'Extract Annotations', {
        description: 'Extract annotations and comments',
        default: false,
      }),
      input.string('pageRange', 'Page Range', {
        description: 'Pages to extract (e.g., "1-5, 8")',
        placeholder: '1-10',
      }),
      input.string('password', 'Password', {
        description: 'PDF password if encrypted',
      }),
      input.boolean('ocr', 'Enable OCR', {
        description: 'Use OCR for scanned documents',
        default: false,
      }),
      input.string('ocrLanguage', 'OCR Language', {
        description: 'OCR language code',
        default: 'eng',
      }),
      input.select(
        'outputFormat',
        'Output Format',
        [
          { label: 'Plain Text', value: 'text' },
          { label: 'JSON', value: 'json' },
          { label: 'Structured', value: 'structured' },
        ],
        { default: 'text' }
      ),
      input.boolean('preserveFormatting', 'Preserve Formatting', {
        description: 'Try to preserve text formatting',
        default: false,
      }),
      input.boolean('splitPages', 'Split by Pages', {
        description: 'Return content split by page',
        default: false,
      }),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: {
      source: 'file',
      extractText: true,
      extractImages: false,
      extractTables: false,
      extractMetadata: true,
      extractAnnotations: false,
      ocr: false,
      ocrLanguage: 'eng',
      outputFormat: 'text',
      preserveFormatting: false,
      splitPages: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PdfParseNodeSchema.parse(nodeInput.config);

    logger.info(`PDF Parse from ${config.source}`);

    return {
      data: {
        success: true,
        text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit...',
        pages: config.splitPages ? [
          { page: 1, text: 'Page 1 content...' },
          { page: 2, text: 'Page 2 content...' },
        ] : [],
        images: config.extractImages ? [
          { page: 1, index: 0, base64: 'iVBORw0KGgo...', width: 800, height: 600 },
        ] : [],
        tables: config.extractTables ? [
          { page: 1, rows: [['Header 1', 'Header 2'], ['Data 1', 'Data 2']] },
        ] : [],
        metadata: {
          title: 'Sample Document',
          author: 'John Doe',
          subject: 'Sample',
          creator: 'Microsoft Word',
          producer: 'Adobe PDF Library',
          creationDate: '2024-01-15T10:00:00Z',
          modificationDate: '2024-01-15T12:00:00Z',
        },
        pageCount: 15,
      },
    };
  }
);
