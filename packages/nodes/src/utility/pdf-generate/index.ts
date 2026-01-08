import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

// Watermark configuration
const WatermarkSchema = z.object({
  text: z.string().optional(),
  image: z.string().optional(),
  opacity: z.number().min(0).max(1).default(0.3),
  rotation: z.number().default(-45),
  fontSize: z.number().default(48),
  color: z.string().default('#cccccc'),
  position: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tile']).default('center'),
});

// Table style configuration
const TableStyleSchema = z.object({
  headerBackground: z.string().default('#f3f4f6'),
  headerTextColor: z.string().default('#111827'),
  rowBackground: z.string().default('#ffffff'),
  alternateRowBackground: z.string().optional(),
  borderColor: z.string().default('#e5e7eb'),
  borderWidth: z.number().default(1),
  cellPadding: z.string().default('8px 12px'),
  fontSize: z.string().default('12px'),
  headerFontWeight: z.string().default('bold'),
});

// Chart configuration for embedded charts
const ChartConfigSchema = z.object({
  type: z.enum(['bar', 'line', 'pie', 'doughnut', 'area', 'radar']),
  data: z.array(z.record(z.unknown())),
  width: z.number().default(400),
  height: z.number().default(300),
  title: z.string().optional(),
  colors: z.array(z.string()).optional(),
  showLegend: z.boolean().default(true),
  showLabels: z.boolean().default(true),
});

// Page break configuration
const PageBreakSchema = z.object({
  before: z.array(z.string()).optional(),
  after: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
});

export const PdfGenerateNodeSchema = z.object({
  source: z.enum(['html', 'template', 'url', 'markdown', 'data', 'merge']).default('html'),
  html: z.string().optional(),
  templateEngine: z.enum(['handlebars', 'mustache', 'ejs', 'nunjucks', 'liquid']).default('handlebars'),
  template: z.string().optional(),
  templatePath: z.string().optional(),
  templateData: z.record(z.unknown()).optional(),
  helpers: z.record(z.string()).optional(),
  partials: z.record(z.string()).optional(),
  url: z.string().optional(),
  markdown: z.string().optional(),
  markdownOptions: z.object({
    gfm: z.boolean().default(true),
    tables: z.boolean().default(true),
    breaks: z.boolean().default(false),
    sanitize: z.boolean().default(true),
    smartLists: z.boolean().default(true),
    smartypants: z.boolean().default(true),
    headerIds: z.boolean().default(true),
    mangle: z.boolean().default(true),
    highlightCode: z.boolean().default(true),
    codeTheme: z.string().default('github'),
  }).optional(),
  data: z.array(z.record(z.unknown())).optional(),
  dataTemplate: z.string().optional(),
  mergeFiles: z.array(z.string()).optional(),
  mergeBase64Files: z.array(z.string()).optional(),
  outputPath: z.string().optional(),
  filename: z.string().default('document.pdf'),
  pageSize: z.enum(['A4', 'A3', 'A5', 'A6', 'Letter', 'Legal', 'Tabloid', 'Ledger', 'Executive', 'custom']).default('A4'),
  customWidth: z.string().optional(),
  customHeight: z.string().optional(),
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
  headerHeight: z.string().optional(),
  footerHeight: z.string().optional(),
  printBackground: z.boolean().default(true),
  preferCSSPageSize: z.boolean().default(false),
  scale: z.number().min(0.1).max(2).default(1),
  pageRanges: z.string().optional(),
  omitBackground: z.boolean().default(false),
  waitForSelector: z.string().optional(),
  waitForFunction: z.string().optional(),
  waitTimeout: z.number().default(30000),
  delay: z.number().default(0),
  emulateMediaType: z.enum(['screen', 'print', 'none']).default('print'),
  format: z.enum(['pdf', 'pdf/a', 'pdf/a-1a', 'pdf/a-1b', 'pdf/a-2a', 'pdf/a-2b', 'pdf/a-3a', 'pdf/a-3b']).default('pdf'),
  pdfVersion: z.string().optional(),
  tagged: z.boolean().default(false),
  outline: z.boolean().default(false),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    creator: z.string().optional(),
    producer: z.string().optional(),
    creationDate: z.string().optional(),
    modDate: z.string().optional(),
  }).optional(),
  watermark: WatermarkSchema.optional(),
  password: z.string().optional(),
  ownerPassword: z.string().optional(),
  permissions: z.object({
    printing: z.enum(['none', 'lowResolution', 'highResolution']).default('highResolution'),
    modifying: z.boolean().default(true),
    copying: z.boolean().default(true),
    annotating: z.boolean().default(true),
    fillingForms: z.boolean().default(true),
    contentAccessibility: z.boolean().default(true),
    documentAssembly: z.boolean().default(true),
  }).optional(),
  compress: z.boolean().default(true),
  embedFonts: z.boolean().default(true),
  fontPaths: z.array(z.string()).optional(),
  defaultFont: z.string().optional(),
  tableStyle: TableStyleSchema.optional(),
  charts: z.array(ChartConfigSchema).optional(),
  pageBreaks: PageBreakSchema.optional(),
  tableOfContents: z.object({
    enabled: z.boolean().default(false),
    depth: z.number().min(1).max(6).default(3),
    title: z.string().default('Table of Contents'),
    pageNumbers: z.boolean().default(true),
    dotLeaders: z.boolean().default(true),
  }).optional(),
  pageNumbers: z.object({
    enabled: z.boolean().default(false),
    format: z.string().default('Page {{page}} of {{pages}}'),
    position: z.enum(['header', 'footer']).default('footer'),
    alignment: z.enum(['left', 'center', 'right']).default('center'),
    startPage: z.number().default(1),
    skipPages: z.array(z.number()).optional(),
  }).optional(),
  css: z.string().optional(),
  cssFiles: z.array(z.string()).optional(),
  jsFiles: z.array(z.string()).optional(),
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(800),
    deviceScaleFactor: z.number().default(1),
  }).optional(),
  timeout: z.number().default(60000),
  screenshots: z.boolean().default(false),
  screenshotFormat: z.enum(['png', 'jpeg', 'webp']).default('png'),
  screenshotQuality: z.number().min(0).max(100).default(80),
  debug: z.boolean().default(false),
});

export type PdfGenerateNodeConfig = z.infer<typeof PdfGenerateNodeSchema>;

export const pdfGenerateNode: NodeDefinition = createNode(
  {
    type: 'utility.pdf-generate',
    category: 'utility',
    name: 'PDF Generate',
    description: 'Generate PDF from HTML templates, Markdown, URLs, or data with advanced styling and features',
    icon: 'FileText',
    inputs: [
      input.select(
        'source',
        'Source Type',
        [
          { label: 'HTML Content', value: 'html' },
          { label: 'Template + Data', value: 'template' },
          { label: 'URL Screenshot', value: 'url' },
          { label: 'Markdown', value: 'markdown' },
          { label: 'Data Table', value: 'data' },
          { label: 'Merge PDFs', value: 'merge' },
        ],
        { default: 'html' }
      ),
      input.code('html', 'HTML Content', {
        description: 'HTML content to convert',
        placeholder: '<html><body><h1>Hello World</h1></body></html>',
      }),
      input.select(
        'templateEngine',
        'Template Engine',
        [
          { label: 'Handlebars', value: 'handlebars' },
          { label: 'Mustache', value: 'mustache' },
          { label: 'EJS', value: 'ejs' },
          { label: 'Nunjucks', value: 'nunjucks' },
          { label: 'Liquid', value: 'liquid' },
        ],
        { default: 'handlebars' }
      ),
      input.code('template', 'Template', {
        description: 'Template content with placeholders',
        placeholder: '<h1>{{title}}</h1><p>{{content}}</p>',
      }),
      input.string('templatePath', 'Template Path', {
        description: 'Path to template file',
      }),
      input.json('templateData', 'Template Data', {
        description: 'Data to inject into template',
        default: {},
      }),
      input.json('helpers', 'Template Helpers', {
        description: 'Custom template helper functions',
        default: {},
      }),
      input.json('partials', 'Template Partials', {
        description: 'Reusable template partials',
        default: {},
      }),
      input.string('url', 'URL', {
        description: 'URL to capture as PDF',
        placeholder: 'https://example.com',
      }),
      input.code('markdown', 'Markdown Content', {
        description: 'Markdown content to convert',
        placeholder: '# Hello World\n\nThis is **markdown**',
      }),
      input.json('markdownOptions', 'Markdown Options', {
        description: 'Markdown parsing options',
        default: { gfm: true, tables: true },
      }),
      input.json('data', 'Data', {
        description: 'Data array to render as table or list',
        default: [],
      }),
      input.code('dataTemplate', 'Data Template', {
        description: 'Template for rendering each data item',
      }),
      input.json('mergeFiles', 'PDF Files to Merge', {
        description: 'Array of PDF file paths to merge',
        default: [],
      }),
      input.json('mergeBase64Files', 'PDF Base64 to Merge', {
        description: 'Array of base64 encoded PDFs to merge',
        default: [],
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
          { label: 'A6', value: 'A6' },
          { label: 'Letter', value: 'Letter' },
          { label: 'Legal', value: 'Legal' },
          { label: 'Tabloid', value: 'Tabloid' },
          { label: 'Ledger', value: 'Ledger' },
          { label: 'Executive', value: 'Executive' },
          { label: 'Custom', value: 'custom' },
        ],
        { default: 'A4' }
      ),
      input.string('customWidth', 'Custom Width', {
        description: 'Custom page width (e.g., 210mm)',
        placeholder: '210mm',
      }),
      input.string('customHeight', 'Custom Height', {
        description: 'Custom page height (e.g., 297mm)',
        placeholder: '297mm',
      }),
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
        description: 'Page margins (top, right, bottom, left)',
        default: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      }),
      input.code('headerTemplate', 'Header Template', {
        description: 'HTML template for page header',
        placeholder: '<div style="font-size: 10px; text-align: center;">{{title}}</div>',
      }),
      input.code('footerTemplate', 'Footer Template', {
        description: 'HTML template for page footer',
        placeholder: '<div style="font-size: 10px; text-align: center;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      }),
      input.boolean('displayHeaderFooter', 'Display Header/Footer', {
        description: 'Show header and footer',
        default: false,
      }),
      input.string('headerHeight', 'Header Height', {
        description: 'Height of header area',
        placeholder: '20mm',
      }),
      input.string('footerHeight', 'Footer Height', {
        description: 'Height of footer area',
        placeholder: '20mm',
      }),
      input.boolean('printBackground', 'Print Background', {
        description: 'Include background graphics and colors',
        default: true,
      }),
      input.number('scale', 'Scale', {
        description: 'Scale factor (0.1 to 2)',
        default: 1,
        min: 0.1,
        max: 2,
      }),
      input.string('pageRanges', 'Page Ranges', {
        description: 'Page ranges to include (e.g., "1-5, 8, 11-13")',
        placeholder: '1-5, 8',
      }),
      input.select(
        'emulateMediaType',
        'Media Type',
        [
          { label: 'Print', value: 'print' },
          { label: 'Screen', value: 'screen' },
          { label: 'None', value: 'none' },
        ],
        { default: 'print' }
      ),
      input.select(
        'format',
        'PDF Format',
        [
          { label: 'Standard PDF', value: 'pdf' },
          { label: 'PDF/A (Archival)', value: 'pdf/a' },
          { label: 'PDF/A-1a', value: 'pdf/a-1a' },
          { label: 'PDF/A-1b', value: 'pdf/a-1b' },
          { label: 'PDF/A-2a', value: 'pdf/a-2a' },
          { label: 'PDF/A-2b', value: 'pdf/a-2b' },
          { label: 'PDF/A-3a', value: 'pdf/a-3a' },
          { label: 'PDF/A-3b', value: 'pdf/a-3b' },
        ],
        { default: 'pdf' }
      ),
      input.boolean('tagged', 'Tagged PDF', {
        description: 'Create tagged PDF for accessibility',
        default: false,
      }),
      input.boolean('outline', 'Generate Outline', {
        description: 'Generate document outline/bookmarks',
        default: false,
      }),
      input.json('metadata', 'Document Metadata', {
        description: 'PDF metadata (title, author, keywords, etc.)',
        default: {},
      }),
      input.json('watermark', 'Watermark', {
        description: 'Watermark configuration',
        default: {},
      }),
      input.string('password', 'User Password', {
        description: 'Password to open the PDF',
      }),
      input.string('ownerPassword', 'Owner Password', {
        description: 'Password for PDF permissions',
      }),
      input.json('permissions', 'PDF Permissions', {
        description: 'Document permissions (printing, copying, etc.)',
        default: {},
      }),
      input.boolean('compress', 'Compress PDF', {
        description: 'Compress output PDF',
        default: true,
      }),
      input.boolean('embedFonts', 'Embed Fonts', {
        description: 'Embed fonts in PDF',
        default: true,
      }),
      input.json('fontPaths', 'Custom Font Paths', {
        description: 'Paths to custom font files',
        default: [],
      }),
      input.string('defaultFont', 'Default Font', {
        description: 'Default font family',
        placeholder: 'Arial, sans-serif',
      }),
      input.json('tableStyle', 'Table Style', {
        description: 'Default styling for data tables',
        default: {},
      }),
      input.json('charts', 'Charts', {
        description: 'Chart configurations to embed',
        default: [],
      }),
      input.json('pageBreaks', 'Page Breaks', {
        description: 'Page break configuration',
        default: {},
      }),
      input.json('tableOfContents', 'Table of Contents', {
        description: 'Table of contents configuration',
        default: { enabled: false },
      }),
      input.json('pageNumbers', 'Page Numbers', {
        description: 'Page numbering configuration',
        default: { enabled: false },
      }),
      input.code('css', 'Custom CSS', {
        description: 'Custom CSS styles to inject',
      }),
      input.json('cssFiles', 'CSS Files', {
        description: 'Paths to CSS files to include',
        default: [],
      }),
      input.json('jsFiles', 'JavaScript Files', {
        description: 'Paths to JS files to include',
        default: [],
      }),
      input.json('viewport', 'Viewport', {
        description: 'Browser viewport settings',
        default: { width: 1280, height: 800 },
      }),
      input.string('waitForSelector', 'Wait For Selector', {
        description: 'CSS selector to wait for before generating',
        placeholder: '.content-loaded',
      }),
      input.string('waitForFunction', 'Wait For Function', {
        description: 'JavaScript expression to wait for',
        placeholder: 'window.dataLoaded === true',
      }),
      input.number('waitTimeout', 'Wait Timeout', {
        description: 'Timeout for waiting (ms)',
        default: 30000,
      }),
      input.number('delay', 'Delay', {
        description: 'Delay before generating (ms)',
        default: 0,
      }),
      input.number('timeout', 'Timeout', {
        description: 'Total timeout (ms)',
        default: 60000,
      }),
      input.boolean('screenshots', 'Generate Screenshots', {
        description: 'Also generate page screenshots',
        default: false,
      }),
      input.select(
        'screenshotFormat',
        'Screenshot Format',
        [
          { label: 'PNG', value: 'png' },
          { label: 'JPEG', value: 'jpeg' },
          { label: 'WebP', value: 'webp' },
        ],
        { default: 'png' }
      ),
      input.boolean('debug', 'Debug Mode', {
        description: 'Enable debug output',
        default: false,
      }),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: {
      source: 'html',
      templateEngine: 'handlebars',
      filename: 'document.pdf',
      pageSize: 'A4',
      orientation: 'portrait',
      displayHeaderFooter: false,
      printBackground: true,
      scale: 1,
      emulateMediaType: 'print',
      format: 'pdf',
      tagged: false,
      outline: false,
      compress: true,
      embedFonts: true,
      waitTimeout: 30000,
      delay: 0,
      timeout: 60000,
      screenshots: false,
      screenshotFormat: 'png',
      debug: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PdfGenerateNodeSchema.parse(nodeInput.config);

    logger.info(`PDF Generate from ${config.source}`);

    // Mock HTML content based on source type
    let generatedHtml = '';
    switch (config.source) {
      case 'html':
        generatedHtml = config.html || '<html><body><h1>Generated PDF</h1></body></html>';
        break;
      case 'template':
        generatedHtml = `
          <html>
            <head><title>${(config.templateData as { title?: string })?.title || 'Document'}</title></head>
            <body>
              <h1>${(config.templateData as { title?: string })?.title || 'Untitled'}</h1>
              <p>${(config.templateData as { content?: string })?.content || ''}</p>
            </body>
          </html>
        `;
        break;
      case 'markdown':
        generatedHtml = `
          <html>
            <head><title>Markdown Document</title></head>
            <body class="markdown-body">
              ${config.markdown || ''}
            </body>
          </html>
        `;
        break;
      case 'data':
        const dataRows = (config.data || []).map((row: Record<string, unknown>) =>
          `<tr>${Object.values(row).map(v => `<td>${v}</td>`).join('')}</tr>`
        ).join('');
        const dataHeaders = config.data?.[0] ?
          `<tr>${Object.keys(config.data[0]).map(k => `<th>${k}</th>`).join('')}</tr>` : '';
        generatedHtml = `
          <html>
            <head>
              <title>Data Report</title>
              <style>
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
                tr:nth-child(even) { background-color: #f9fafb; }
              </style>
            </head>
            <body>
              <h1>Data Report</h1>
              <table>
                <thead>${dataHeaders}</thead>
                <tbody>${dataRows}</tbody>
              </table>
            </body>
          </html>
        `;
        break;
      case 'url':
        generatedHtml = `<html><body><h1>Content from ${config.url}</h1></body></html>`;
        break;
      case 'merge':
        generatedHtml = '<html><body><h1>Merged PDF</h1></body></html>';
        break;
    }

    // Add custom CSS if provided
    if (config.css) {
      generatedHtml = generatedHtml.replace('</head>', `<style>${config.css}</style></head>`);
    }

    const result: Record<string, unknown> = {
      success: true,
      path: config.outputPath ? `${config.outputPath}/${config.filename}` : `/tmp/${config.filename}`,
      base64: 'JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+Pg0KZW5kb2JqDQoyIDAgb2JqDQo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+Pg0KZW5kb2JqDQozIDAgb2JqDQo8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXT4+DQplbmRvYmoNCnN0YXJ0eHJlZg0KMTAxDQolJUVPRg==',
      pages: Math.max(1, Math.ceil((generatedHtml.length) / 5000)),
      size: Math.floor(generatedHtml.length * 1.5),
      metadata: {
        title: config.metadata?.title || config.filename,
        author: config.metadata?.author || 'WS-Flows',
        creator: 'WS-Flows PDF Generator',
        producer: 'Puppeteer',
        creationDate: new Date().toISOString(),
        pageSize: config.pageSize,
        orientation: config.orientation,
        format: config.format,
      },
      html: config.debug ? generatedHtml : undefined,
    };

    if (config.outline) {
      result.outline = [
        { title: 'Section 1', page: 1 },
        { title: 'Section 2', page: 2 },
        { title: 'Conclusion', page: 3 },
      ];
    }

    if (config.screenshots) {
      result.screenshots = [
        { page: 1, base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' },
      ];
    }

    if (config.source === 'merge') {
      result.mergedFiles = (config.mergeFiles?.length || 0) + (config.mergeBase64Files?.length || 0);
    }

    return { data: result };
  }
);
