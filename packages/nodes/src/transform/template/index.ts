import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const TemplateNodeSchema = z.object({
  engine: z.enum(['handlebars', 'mustache', 'ejs', 'nunjucks', 'pug', 'liquid']).default('handlebars'),
  template: z.string().optional(),
  templatePath: z.string().optional(),
  data: z.any().optional(),
  helpers: z.record(z.string()).optional(),
  partials: z.record(z.string()).optional(),
  filters: z.record(z.string()).optional(),
  options: z.object({
    strict: z.boolean().optional(),
    noEscape: z.boolean().optional(),
    autoescape: z.boolean().optional(),
    trimBlocks: z.boolean().optional(),
    lstripBlocks: z.boolean().optional(),
    cache: z.boolean().optional(),
  }).optional(),
  outputFormat: z.enum(['string', 'html', 'text', 'markdown']).default('string'),
  includesPath: z.string().optional(),
});

export type TemplateNodeConfig = z.infer<typeof TemplateNodeSchema>;

export const templateNode: NodeDefinition = createNode(
  {
    type: 'transform.template',
    category: 'transform',
    name: 'Template',
    description: 'Render templates with various engines',
    icon: 'FileCode',
    inputs: [
      input.select(
        'engine',
        'Template Engine',
        [
          { label: 'Handlebars', value: 'handlebars' },
          { label: 'Mustache', value: 'mustache' },
          { label: 'EJS', value: 'ejs' },
          { label: 'Nunjucks', value: 'nunjucks' },
          { label: 'Pug', value: 'pug' },
          { label: 'Liquid', value: 'liquid' },
        ],
        { default: 'handlebars' }
      ),
      input.text('template', 'Template', {
        description: 'Template string',
        placeholder: 'Hello, {{name}}!',
      }),
      input.string('templatePath', 'Template Path', {
        description: 'Path to template file',
        placeholder: '/templates/email.hbs',
      }),
      input.json('data', 'Data', {
        description: 'Data to render in template',
        default: {},
      }),
      input.json('helpers', 'Helpers', {
        description: 'Custom helper functions',
        default: {},
      }),
      input.json('partials', 'Partials', {
        description: 'Partial templates',
        default: {},
      }),
      input.json('filters', 'Filters', {
        description: 'Custom filters (Nunjucks/Liquid)',
        default: {},
      }),
      input.json('options', 'Options', {
        description: 'Engine-specific options',
        default: {},
      }),
      input.select(
        'outputFormat',
        'Output Format',
        [
          { label: 'String', value: 'string' },
          { label: 'HTML', value: 'html' },
          { label: 'Plain Text', value: 'text' },
          { label: 'Markdown', value: 'markdown' },
        ],
        { default: 'string' }
      ),
      input.string('includesPath', 'Includes Path', {
        description: 'Path for partial/include files',
        placeholder: '/templates/partials',
      }),
    ],
    outputs: [output.main({ description: 'Transformation result' })],
    defaults: {
      engine: 'handlebars',
      outputFormat: 'string',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = TemplateNodeSchema.parse(nodeInput.config);

    logger.info(`Template render with ${config.engine}`);

    const startTime = Date.now();
    const data = config.data || { name: 'World', items: ['a', 'b', 'c'] };

    // Mock template rendering based on engine
    let rendered = '';
    switch (config.engine) {
      case 'handlebars':
        rendered = `<!DOCTYPE html>
<html>
<head>
  <title>Hello, ${data.name || 'World'}!</title>
</head>
<body>
  <h1>Welcome, ${data.name || 'Guest'}</h1>
  <ul>
    ${(data.items || []).map((item: string) => `<li>${item}</li>`).join('\n    ')}
  </ul>
</body>
</html>`;
        break;

      case 'mustache':
        rendered = `Hello, ${data.name || 'World'}!\n\nItems:\n${(data.items || []).map((item: string) => `- ${item}`).join('\n')}`;
        break;

      case 'ejs':
        rendered = `<div class="container">
  <h1><%= title %></h1>
  <p>Hello, ${data.name || 'World'}!</p>
</div>`;
        break;

      case 'nunjucks':
        rendered = `{% block content %}
<article>
  <h1>{{ title }}</h1>
  <p>Hello, ${data.name || 'World'}!</p>
</article>
{% endblock %}`;
        break;

      case 'pug':
        rendered = `doctype html
html
  head
    title Hello ${data.name || 'World'}
  body
    h1 Welcome
    ul
      ${(data.items || []).map((item: string) => `li ${item}`).join('\n      ')}`;
        break;

      case 'liquid':
        rendered = `<div>
  <h1>Hello, ${data.name || 'World'}!</h1>
  {% for item in items %}
    <p>{{ item }}</p>
  {% endfor %}
</div>`;
        break;
    }

    const renderTime = Date.now() - startTime;

    return {
      data: {
        success: true,
        rendered,
        html: config.outputFormat === 'html' ? rendered : undefined,
        renderTime,
      },
    };
  }
);
