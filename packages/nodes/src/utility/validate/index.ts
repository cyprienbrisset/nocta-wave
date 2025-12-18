import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ValidateNodeSchema = z.object({
  mode: z.enum(['schema', 'format', 'custom', 'multiple']).default('format'),
  inputData: z.any().optional(),
  jsonSchema: z.any().optional(),
  formatType: z.enum([
    'email', 'url', 'uuid', 'phone', 'creditCard', 'iban', 'ipv4', 'ipv6',
    'date', 'dateTime', 'time', 'postalCode', 'ssn', 'vatNumber', 'slug',
    'semver', 'hexColor', 'base64', 'jwt', 'cron', 'json', 'xml'
  ]).default('email'),
  customRegex: z.string().optional(),
  customFunction: z.string().optional(),
  rules: z.array(z.object({
    field: z.string(),
    type: z.string(),
    required: z.boolean().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
  })).optional(),
  strict: z.boolean().default(false),
  abortEarly: z.boolean().default(false),
  stripUnknown: z.boolean().default(false),
  coerce: z.boolean().default(false),
  locale: z.string().default('en'),
  countryCode: z.string().optional(),
});

export type ValidateNodeConfig = z.infer<typeof ValidateNodeSchema>;

export const validateNode: NodeDefinition = createNode(
  {
    type: 'utility.validate',
    category: 'utility',
    name: 'Validate',
    description: 'Validate data against schemas and formats',
    icon: 'CheckCircle',
    inputs: [
      input.select(
        'mode',
        'Validation Mode',
        [
          { label: 'JSON Schema', value: 'schema' },
          { label: 'Format Validation', value: 'format' },
          { label: 'Custom Regex', value: 'custom' },
          { label: 'Multiple Rules', value: 'multiple' },
        ],
        { default: 'format' }
      ),
      input.json('inputData', 'Input Data', {
        description: 'Data to validate',
        default: {},
      }),
      input.json('jsonSchema', 'JSON Schema', {
        description: 'JSON Schema for validation',
        default: {},
      }),
      input.select(
        'formatType',
        'Format Type',
        [
          { label: 'Email', value: 'email' },
          { label: 'URL', value: 'url' },
          { label: 'UUID', value: 'uuid' },
          { label: 'Phone Number', value: 'phone' },
          { label: 'Credit Card', value: 'creditCard' },
          { label: 'IBAN', value: 'iban' },
          { label: 'IPv4 Address', value: 'ipv4' },
          { label: 'IPv6 Address', value: 'ipv6' },
          { label: 'Date (YYYY-MM-DD)', value: 'date' },
          { label: 'DateTime (ISO 8601)', value: 'dateTime' },
          { label: 'Time (HH:mm:ss)', value: 'time' },
          { label: 'Postal Code', value: 'postalCode' },
          { label: 'Semantic Version', value: 'semver' },
          { label: 'Hex Color', value: 'hexColor' },
          { label: 'Base64', value: 'base64' },
          { label: 'JWT', value: 'jwt' },
          { label: 'Cron Expression', value: 'cron' },
          { label: 'JSON', value: 'json' },
          { label: 'XML', value: 'xml' },
        ],
        { default: 'email' }
      ),
      input.string('customRegex', 'Custom Regex', {
        description: 'Custom regular expression pattern',
        placeholder: '^[A-Z]{2}[0-9]{6}$',
      }),
      input.text('customFunction', 'Custom Function', {
        description: 'Custom validation function (JavaScript)',
      }),
      input.json('rules', 'Validation Rules', {
        description: 'Multiple validation rules',
        default: [],
      }),
      input.boolean('strict', 'Strict Mode', {
        description: 'Fail on unknown properties',
        default: false,
      }),
      input.boolean('abortEarly', 'Abort Early', {
        description: 'Stop on first error',
        default: false,
      }),
      input.boolean('stripUnknown', 'Strip Unknown', {
        description: 'Remove unknown properties',
        default: false,
      }),
      input.boolean('coerce', 'Coerce Types', {
        description: 'Try to convert types',
        default: false,
      }),
      input.string('locale', 'Locale', {
        description: 'Locale for format validation',
        default: 'en',
      }),
      input.string('countryCode', 'Country Code', {
        description: 'Country code for regional formats',
        placeholder: 'US',
      }),
    ],
    outputs: [
      output.boolean('valid', 'Validation result'),
      output.array('errors', 'Validation errors'),
      output.object('validated', 'Validated/sanitized data'),
      output.object('details', 'Detailed validation info'),
      output.number('errorCount', 'Number of errors'),
    ],
    defaults: {
      mode: 'format',
      formatType: 'email',
      strict: false,
      abortEarly: false,
      stripUnknown: false,
      coerce: false,
      locale: 'en',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ValidateNodeSchema.parse(nodeInput.config);

    logger.info(`Validate ${config.mode}: ${config.formatType}`);

    switch (config.mode) {
      case 'format':
        const data = config.inputData;
        let isValid = false;
        let errorMessage = '';

        const patterns: Record<string, RegExp> = {
          email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          url: /^https?:\/\/.+/,
          uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          phone: /^\+?[0-9]{10,15}$/,
          creditCard: /^[0-9]{13,19}$/,
          iban: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,30}$/,
          ipv4: /^(\d{1,3}\.){3}\d{1,3}$/,
          ipv6: /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
          date: /^\d{4}-\d{2}-\d{2}$/,
          dateTime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
          time: /^\d{2}:\d{2}(:\d{2})?$/,
          semver: /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/,
          hexColor: /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/,
          base64: /^[A-Za-z0-9+/]*={0,2}$/,
          jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/,
          cron: /^(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)\s+(\*|[0-9,\-\/]+)$/,
        };

        const pattern = patterns[config.formatType];
        if (pattern) {
          isValid = pattern.test(String(data));
          if (!isValid) {
            errorMessage = `Value does not match ${config.formatType} format`;
          }
        } else if (config.formatType === 'json') {
          try {
            JSON.parse(String(data));
            isValid = true;
          } catch {
            isValid = false;
            errorMessage = 'Invalid JSON';
          }
        }

        return {
          data: {
            valid: isValid,
            errors: isValid ? [] : [{ path: '', message: errorMessage, type: config.formatType }],
            validated: isValid ? data : null,
            details: {
              format: config.formatType,
              input: data,
            },
            errorCount: isValid ? 0 : 1,
          },
        };

      case 'schema':
        // Mock JSON Schema validation
        return {
          data: {
            valid: true,
            errors: [],
            validated: config.inputData,
            details: {
              schema: config.jsonSchema,
              validatedProperties: Object.keys(config.inputData || {}),
            },
            errorCount: 0,
          },
        };

      case 'custom':
        const regex = new RegExp(config.customRegex || '.*');
        const customValid = regex.test(String(config.inputData));
        return {
          data: {
            valid: customValid,
            errors: customValid ? [] : [{ path: '', message: 'Does not match pattern', pattern: config.customRegex }],
            validated: customValid ? config.inputData : null,
            errorCount: customValid ? 0 : 1,
          },
        };

      case 'multiple':
        const rules = config.rules || [];
        const errors: Array<{ field: string; message: string; rule: string }> = [];
        const inputObj = config.inputData || {};

        for (const rule of rules) {
          const value = inputObj[rule.field];

          if (rule.required && (value === undefined || value === null || value === '')) {
            errors.push({ field: rule.field, message: `${rule.field} is required`, rule: 'required' });
          }

          if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
            errors.push({ field: rule.field, message: `${rule.field} must be at least ${rule.min}`, rule: 'min' });
          }

          if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
            errors.push({ field: rule.field, message: `${rule.field} must be at most ${rule.max}`, rule: 'max' });
          }

          if (rule.pattern && !new RegExp(rule.pattern).test(String(value))) {
            errors.push({ field: rule.field, message: `${rule.field} does not match pattern`, rule: 'pattern' });
          }
        }

        return {
          data: {
            valid: errors.length === 0,
            errors,
            validated: errors.length === 0 ? config.inputData : null,
            details: {
              rulesChecked: rules.length,
              rulesPassed: rules.length - errors.length,
            },
            errorCount: errors.length,
          },
        };

      default:
        return { data: { valid: true, errors: [], errorCount: 0 } };
    }
  }
);
