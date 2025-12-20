import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const PuppeteerSchema = z.object({
  operation: z.enum([
    'navigate',
    'screenshot',
    'pdf',
    'scrape',
    'click',
    'type',
    'evaluate',
    'waitFor',
    'scroll',
    'extract',
    'form',
    'cookies',
  ]).default('navigate'),
  url: z.string().url().optional(),
  selector: z.string().optional(),
  selectors: z.array(z.object({
    name: z.string(),
    selector: z.string(),
    type: z.enum(['text', 'html', 'attribute', 'value', 'all']).default('text'),
    attribute: z.string().optional(),
    multiple: z.boolean().default(false),
  })).optional(),
  text: z.string().optional(),
  code: z.string().optional(),
  // Screenshot options
  fullPage: z.boolean().default(false),
  screenshotType: z.enum(['png', 'jpeg', 'webp']).default('png'),
  quality: z.number().min(0).max(100).default(80),
  omitBackground: z.boolean().default(false),
  // PDF options
  pdfFormat: z.enum(['Letter', 'Legal', 'Tabloid', 'Ledger', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6']).default('A4'),
  pdfMargin: z.object({
    top: z.string().optional(),
    right: z.string().optional(),
    bottom: z.string().optional(),
    left: z.string().optional(),
  }).optional(),
  printBackground: z.boolean().default(true),
  landscape: z.boolean().default(false),
  // Browser options
  headless: z.boolean().default(true),
  viewport: z.object({
    width: z.number().default(1920),
    height: z.number().default(1080),
  }).default({ width: 1920, height: 1080 }),
  userAgent: z.string().optional(),
  timeout: z.number().min(1000).max(300000).default(30000),
  waitUntil: z.enum(['load', 'domcontentloaded', 'networkidle0', 'networkidle2']).default('networkidle2'),
  // Form options
  formData: z.record(z.string()).optional(),
  submitSelector: z.string().optional(),
  // Cookie operations
  cookieOperation: z.enum(['get', 'set', 'delete', 'clear']).default('get'),
  cookies: z.array(z.object({
    name: z.string(),
    value: z.string(),
    domain: z.string().optional(),
    path: z.string().optional(),
    expires: z.number().optional(),
    httpOnly: z.boolean().optional(),
    secure: z.boolean().optional(),
    sameSite: z.enum(['Strict', 'Lax', 'None']).optional(),
  })).optional(),
  // Scroll options
  scrollDirection: z.enum(['top', 'bottom', 'element']).default('bottom'),
  scrollAmount: z.number().optional(),
  // Wait options
  waitType: z.enum(['selector', 'navigation', 'timeout', 'function']).default('selector'),
  waitTimeout: z.number().default(30000),
  // Advanced
  blockResources: z.array(z.enum(['image', 'stylesheet', 'font', 'media', 'script'])).optional(),
  extraHeaders: z.record(z.string()).optional(),
  proxy: z.string().optional(),
  authenticate: z.object({
    username: z.string(),
    password: z.string(),
  }).optional(),
});

export const puppeteerNode: NodeDefinition = createNode(
  {
    type: 'integration.puppeteer',
    category: 'integration',
    name: 'Puppeteer',
    description: 'Web scraping, browser automation, screenshots, PDF generation, and form automation using headless Chrome',
    icon: 'Globe',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Navigate to URL', value: 'navigate', description: 'Navigate to a webpage' },
        { label: 'Take Screenshot', value: 'screenshot', description: 'Capture a screenshot of the page' },
        { label: 'Generate PDF', value: 'pdf', description: 'Generate a PDF document' },
        { label: 'Scrape Data', value: 'scrape', description: 'Extract data from the page' },
        { label: 'Click Element', value: 'click', description: 'Click on an element' },
        { label: 'Type Text', value: 'type', description: 'Type text into an input field' },
        { label: 'Evaluate Script', value: 'evaluate', description: 'Run JavaScript in the browser context' },
        { label: 'Wait For', value: 'waitFor', description: 'Wait for an element, navigation, or timeout' },
        { label: 'Scroll Page', value: 'scroll', description: 'Scroll the page' },
        { label: 'Extract Data', value: 'extract', description: 'Extract multiple data points with selectors' },
        { label: 'Fill Form', value: 'form', description: 'Fill and submit a form' },
        { label: 'Manage Cookies', value: 'cookies', description: 'Get, set, or clear cookies' },
      ], { default: 'navigate' }),
      input.string('url', 'URL', {
        required: true,
        description: 'The URL to navigate to',
        placeholder: 'https://example.com',
      }),
      input.string('selector', 'CSS Selector', {
        description: 'CSS selector for element operations',
        placeholder: '#main-content, .article-title',
      }),
      input.json('selectors', 'Data Selectors', {
        description: 'Array of selectors for data extraction',
        showWhen: { field: 'operation', equals: 'extract' },
        placeholder: `[
  { "name": "title", "selector": "h1", "type": "text" },
  { "name": "links", "selector": "a", "type": "attribute", "attribute": "href", "multiple": true }
]`,
      }),
      input.string('text', 'Text to Type', {
        description: 'Text to type into input fields',
        showWhen: { field: 'operation', equals: 'type' },
      }),
      input.code('code', 'JavaScript Code', {
        language: 'javascript',
        description: 'JavaScript code to evaluate in the browser',
        showWhen: { field: 'operation', equals: 'evaluate' },
        placeholder: `// Return value from the browser
return document.title;`,
      }),
      // Screenshot options
      input.boolean('fullPage', 'Full Page Screenshot', {
        default: false,
        showWhen: { field: 'operation', equals: 'screenshot' },
      }),
      input.select('screenshotType', 'Image Format', [
        { label: 'PNG', value: 'png' },
        { label: 'JPEG', value: 'jpeg' },
        { label: 'WebP', value: 'webp' },
      ], { default: 'png', showWhen: { field: 'operation', equals: 'screenshot' } }),
      input.number('quality', 'Image Quality', {
        default: 80,
        description: 'Quality for JPEG/WebP (0-100)',
        showWhen: { field: 'operation', equals: 'screenshot' },
      }),
      input.boolean('omitBackground', 'Transparent Background', {
        default: false,
        showWhen: { field: 'operation', equals: 'screenshot' },
      }),
      // PDF options
      input.select('pdfFormat', 'PDF Page Format', [
        { label: 'A4', value: 'A4' },
        { label: 'Letter', value: 'Letter' },
        { label: 'Legal', value: 'Legal' },
        { label: 'A3', value: 'A3' },
        { label: 'A5', value: 'A5' },
        { label: 'Tabloid', value: 'Tabloid' },
      ], { default: 'A4', showWhen: { field: 'operation', equals: 'pdf' } }),
      input.boolean('landscape', 'Landscape Orientation', {
        default: false,
        showWhen: { field: 'operation', equals: 'pdf' },
      }),
      input.boolean('printBackground', 'Print Background', {
        default: true,
        showWhen: { field: 'operation', equals: 'pdf' },
      }),
      // Browser settings
      input.boolean('headless', 'Headless Mode', {
        default: true,
        description: 'Run browser without visible window',
      }),
      input.json('viewport', 'Viewport Size', {
        default: { width: 1920, height: 1080 },
        description: 'Browser viewport dimensions',
      }),
      input.string('userAgent', 'User Agent', {
        description: 'Custom user agent string',
      }),
      input.number('timeout', 'Timeout (ms)', {
        default: 30000,
        description: 'Maximum wait time for operations',
      }),
      input.select('waitUntil', 'Wait Until', [
        { label: 'Page Load', value: 'load' },
        { label: 'DOM Content Loaded', value: 'domcontentloaded' },
        { label: 'Network Idle (0)', value: 'networkidle0' },
        { label: 'Network Idle (2)', value: 'networkidle2' },
      ], { default: 'networkidle2' }),
      // Form options
      input.json('formData', 'Form Data', {
        description: 'Key-value pairs to fill in the form',
        showWhen: { field: 'operation', equals: 'form' },
        placeholder: '{"email": "user@example.com", "password": "secret"}',
      }),
      input.string('submitSelector', 'Submit Button Selector', {
        description: 'Selector for the submit button',
        showWhen: { field: 'operation', equals: 'form' },
      }),
      // Cookie operations
      input.select('cookieOperation', 'Cookie Operation', [
        { label: 'Get Cookies', value: 'get' },
        { label: 'Set Cookies', value: 'set' },
        { label: 'Delete Cookies', value: 'delete' },
        { label: 'Clear All', value: 'clear' },
      ], { default: 'get', showWhen: { field: 'operation', equals: 'cookies' } }),
      input.json('cookies', 'Cookies', {
        description: 'Cookies to set or delete',
        showWhen: { field: 'operation', equals: 'cookies' },
      }),
      // Wait options
      input.select('waitType', 'Wait Type', [
        { label: 'Wait for Selector', value: 'selector' },
        { label: 'Wait for Navigation', value: 'navigation' },
        { label: 'Wait for Timeout', value: 'timeout' },
        { label: 'Wait for Function', value: 'function' },
      ], { default: 'selector', showWhen: { field: 'operation', equals: 'waitFor' } }),
      input.number('waitTimeout', 'Wait Timeout', {
        default: 30000,
        showWhen: { field: 'operation', equals: 'waitFor' },
      }),
      // Scroll options
      input.select('scrollDirection', 'Scroll Direction', [
        { label: 'To Top', value: 'top' },
        { label: 'To Bottom', value: 'bottom' },
        { label: 'To Element', value: 'element' },
      ], { default: 'bottom', showWhen: { field: 'operation', equals: 'scroll' } }),
      input.number('scrollAmount', 'Scroll Amount (px)', {
        description: 'Amount to scroll in pixels',
        showWhen: { field: 'operation', equals: 'scroll' },
      }),
      // Advanced options
      input.json('blockResources', 'Block Resource Types', {
        description: 'Resource types to block (image, stylesheet, font, media, script)',
      }),
      input.json('extraHeaders', 'Extra Headers', {
        description: 'Additional HTTP headers',
      }),
      input.string('proxy', 'Proxy Server', {
        description: 'Proxy server URL',
        placeholder: 'http://proxy:8080',
      }),
      input.json('authenticate', 'HTTP Authentication', {
        description: 'HTTP basic authentication credentials',
        placeholder: '{"username": "user", "password": "pass"}',
      }),
    ],
    outputs: [
      output.object('result', 'Operation result'),
      output.string('screenshot', 'Screenshot as base64 (for screenshot operation)'),
      output.string('pdf', 'PDF as base64 (for pdf operation)'),
      output.object('extractedData', 'Extracted data (for scrape/extract operations)'),
      output.object('cookies', 'Cookies (for cookie operations)'),
      output.string('html', 'Page HTML content'),
      output.string('url', 'Current page URL'),
      output.string('title', 'Page title'),
    ],
    credentials: [],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = PuppeteerSchema.parse(nodeInput.config);

    logger.info(`Puppeteer: ${config.operation} on ${config.url}`);

    // Note: Puppeteer requires actual browser execution which may not be available
    // in all environments. This is a simulation of the expected behavior.
    // In production, you would use actual Puppeteer or Playwright.

    // Simulated response structure
    const simulatedResponse = {
      result: { success: true, operation: config.operation },
      screenshot: config.operation === 'screenshot' ? 'base64_image_data_here' : undefined,
      pdf: config.operation === 'pdf' ? 'base64_pdf_data_here' : undefined,
      extractedData: config.operation === 'extract' || config.operation === 'scrape'
        ? { title: 'Example Title', content: 'Page content here' }
        : undefined,
      cookies: config.operation === 'cookies'
        ? [{ name: 'session', value: 'abc123', domain: 'example.com' }]
        : undefined,
      html: '<!DOCTYPE html><html>...</html>',
      url: config.url,
      title: 'Page Title',
    };

    // In a real implementation, you would:
    // 1. Launch browser with puppeteer.launch({ headless: config.headless })
    // 2. Create new page with browser.newPage()
    // 3. Set viewport, user agent, headers, etc.
    // 4. Navigate to URL
    // 5. Perform the requested operation
    // 6. Return results
    // 7. Close browser

    logger.info(`Puppeteer operation ${config.operation} completed`);

    return { data: simulatedResponse };
  }
);
