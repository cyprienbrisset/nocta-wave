import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HtmlParseSchema = z.object({
  operation: z.enum(['extractText', 'extractLinks', 'extractImages', 'extractMeta', 'querySelector', 'querySelectorAll', 'extractTable', 'stripTags']).default('extractText'),
  html: z.string(),
  selector: z.string().optional(),
  attribute: z.string().optional(),
  includeHref: z.boolean().default(true),
  includeSrc: z.boolean().default(true),
  includeAlt: z.boolean().default(true),
});

// Simple HTML parser without external dependencies
const parseHTML = (html: string) => {
  return {
    // Extract text content (strip all tags)
    extractText: (): string => {
      return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
    },

    // Extract all links
    extractLinks: (includeHref: boolean): Array<{ text: string; href?: string }> => {
      const linkRegex = /<a[^>]*(?:href=["']([^"']*)["'])?[^>]*>([\s\S]*?)<\/a>/gi;
      const links: Array<{ text: string; href?: string }> = [];
      let match;

      while ((match = linkRegex.exec(html)) !== null) {
        const link: { text: string; href?: string } = {
          text: match[2].replace(/<[^>]+>/g, '').trim(),
        };
        if (includeHref && match[1]) {
          link.href = match[1];
        }
        links.push(link);
      }

      return links;
    },

    // Extract all images
    extractImages: (includeSrc: boolean, includeAlt: boolean): Array<{ src?: string; alt?: string }> => {
      const imgRegex = /<img[^>]*>/gi;
      const srcRegex = /src=["']([^"']*)["']/i;
      const altRegex = /alt=["']([^"']*)["']/i;
      const images: Array<{ src?: string; alt?: string }> = [];
      let match;

      while ((match = imgRegex.exec(html)) !== null) {
        const img: { src?: string; alt?: string } = {};
        const srcMatch = srcRegex.exec(match[0]);
        const altMatch = altRegex.exec(match[0]);

        if (includeSrc && srcMatch) {
          img.src = srcMatch[1];
        }
        if (includeAlt && altMatch) {
          img.alt = altMatch[1];
        }

        if (Object.keys(img).length > 0) {
          images.push(img);
        }
      }

      return images;
    },

    // Extract meta tags
    extractMeta: (): Record<string, string> => {
      const metaRegex = /<meta[^>]*>/gi;
      const nameRegex = /(?:name|property)=["']([^"']*)["']/i;
      const contentRegex = /content=["']([^"']*)["']/i;
      const meta: Record<string, string> = {};
      let match;

      // Extract title
      const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      if (titleMatch) {
        meta.title = titleMatch[1].trim();
      }

      while ((match = metaRegex.exec(html)) !== null) {
        const nameMatch = nameRegex.exec(match[0]);
        const contentMatch = contentRegex.exec(match[0]);

        if (nameMatch && contentMatch) {
          meta[nameMatch[1]] = contentMatch[1];
        }
      }

      return meta;
    },

    // Simple querySelector (basic support)
    querySelector: (selector: string, attribute?: string): string | null => {
      // Support basic selectors: tag, .class, #id, tag.class, tag#id
      let regex: RegExp;

      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
      } else if (selector.startsWith('.')) {
        const className = selector.slice(1);
        regex = new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i');
      } else {
        regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'i');
      }

      const match = regex.exec(html);
      if (!match) return null;

      if (attribute) {
        const attrRegex = new RegExp(`${attribute}=["']([^"']*)["']`, 'i');
        const attrMatch = attrRegex.exec(match[0]);
        return attrMatch ? attrMatch[1] : null;
      }

      return match[1].replace(/<[^>]+>/g, '').trim();
    },

    // Simple querySelectorAll (basic support)
    querySelectorAll: (selector: string, attribute?: string): string[] => {
      let regex: RegExp;

      if (selector.startsWith('#')) {
        const id = selector.slice(1);
        regex = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
      } else if (selector.startsWith('.')) {
        const className = selector.slice(1);
        regex = new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'gi');
      } else {
        regex = new RegExp(`<${selector}[^>]*>([\\s\\S]*?)<\\/${selector}>`, 'gi');
      }

      const results: string[] = [];
      let match;

      while ((match = regex.exec(html)) !== null) {
        if (attribute) {
          const attrRegex = new RegExp(`${attribute}=["']([^"']*)["']`, 'i');
          const attrMatch = attrRegex.exec(match[0]);
          if (attrMatch) {
            results.push(attrMatch[1]);
          }
        } else {
          results.push(match[1].replace(/<[^>]+>/g, '').trim());
        }
      }

      return results;
    },

    // Extract table data
    extractTable: (): Array<Record<string, string>> => {
      const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const headerRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

      const tables: Array<Record<string, string>> = [];
      const tableMatch = tableRegex.exec(html);

      if (!tableMatch) return tables;

      const tableHtml = tableMatch[1];
      const headers: string[] = [];
      let headerMatch;

      // Extract headers
      const headerRowMatch = /<tr[^>]*>([\s\S]*?)<\/tr>/i.exec(tableHtml);
      if (headerRowMatch) {
        while ((headerMatch = headerRegex.exec(headerRowMatch[1])) !== null) {
          headers.push(headerMatch[1].replace(/<[^>]+>/g, '').trim());
        }
      }

      // If no <th> found, use first row as headers
      if (headers.length === 0 && headerRowMatch) {
        let cellMatch;
        const tempCellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
        while ((cellMatch = tempCellRegex.exec(headerRowMatch[1])) !== null) {
          headers.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }
      }

      // Extract data rows
      let rowMatch;
      let isFirstRow = true;

      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        if (isFirstRow) {
          isFirstRow = false;
          continue; // Skip header row
        }

        const row: Record<string, string> = {};
        const cells: string[] = [];
        let cellMatch;
        const localCellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

        while ((cellMatch = localCellRegex.exec(rowMatch[1])) !== null) {
          cells.push(cellMatch[1].replace(/<[^>]+>/g, '').trim());
        }

        cells.forEach((cell, index) => {
          const key = headers[index] || `column${index}`;
          row[key] = cell;
        });

        if (Object.keys(row).length > 0) {
          tables.push(row);
        }
      }

      return tables;
    },

    // Strip all HTML tags
    stripTags: (): string => {
      return html.replace(/<[^>]+>/g, '');
    },
  };
};

export const htmlParseNode: NodeDefinition = createNode(
  {
    type: 'utility.html-parse',
    category: 'utility',
    name: 'HTML Parse',
    description: 'Parse and extract data from HTML content',
    icon: 'Code',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Extract Text', value: 'extractText' },
        { label: 'Extract Links', value: 'extractLinks' },
        { label: 'Extract Images', value: 'extractImages' },
        { label: 'Extract Meta Tags', value: 'extractMeta' },
        { label: 'Query Selector', value: 'querySelector' },
        { label: 'Query Selector All', value: 'querySelectorAll' },
        { label: 'Extract Table', value: 'extractTable' },
        { label: 'Strip Tags', value: 'stripTags' },
      ], { default: 'extractText' }),
      input.string('html', 'HTML', { description: 'HTML content to parse' }),
      input.string('selector', 'CSS Selector', { description: 'CSS selector for querySelector operations' }),
      input.string('attribute', 'Attribute', { description: 'Extract specific attribute value' }),
      input.boolean('includeHref', 'Include href', { default: true }),
      input.boolean('includeSrc', 'Include src', { default: true }),
      input.boolean('includeAlt', 'Include alt', { default: true }),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: { operation: 'extractText', includeHref: true, includeSrc: true, includeAlt: true },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HtmlParseSchema.parse(nodeInput.config);

    logger.info(`HTML Parse: ${config.operation}`);

    const parser = parseHTML(config.html);
    let result: unknown;
    let count = 0;

    switch (config.operation) {
      case 'extractText':
        result = parser.extractText();
        count = 1;
        break;

      case 'extractLinks':
        result = parser.extractLinks(config.includeHref);
        count = Array.isArray(result) ? result.length : 0;
        break;

      case 'extractImages':
        result = parser.extractImages(config.includeSrc, config.includeAlt);
        count = Array.isArray(result) ? result.length : 0;
        break;

      case 'extractMeta':
        result = parser.extractMeta();
        count = Object.keys(result as object).length;
        break;

      case 'querySelector':
        if (!config.selector) {
          throw new Error('Selector is required for querySelector operation');
        }
        result = parser.querySelector(config.selector, config.attribute);
        count = result ? 1 : 0;
        break;

      case 'querySelectorAll':
        if (!config.selector) {
          throw new Error('Selector is required for querySelectorAll operation');
        }
        result = parser.querySelectorAll(config.selector, config.attribute);
        count = Array.isArray(result) ? result.length : 0;
        break;

      case 'extractTable':
        result = parser.extractTable();
        count = Array.isArray(result) ? result.length : 0;
        break;

      case 'stripTags':
        result = parser.stripTags();
        count = 1;
        break;

      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    return { data: { result, count } };
  }
);
