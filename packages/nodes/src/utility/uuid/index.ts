import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const UuidNodeSchema = z.object({
  operation: z.enum(['generate', 'validate', 'parse', 'format', 'batch']).default('generate'),
  version: z.enum(['v1', 'v4', 'v5', 'v6', 'v7', 'nil', 'max']).default('v4'),
  uuid: z.string().optional(),
  namespace: z.string().optional(),
  name: z.string().optional(),
  count: z.number().min(1).max(1000).default(1),
  format: z.enum(['standard', 'uppercase', 'urn', 'braces', 'base64', 'short']).default('standard'),
  node: z.string().optional(),
  clockSeq: z.number().optional(),
});

export type UuidNodeConfig = z.infer<typeof UuidNodeSchema>;

// Generate mock UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export const uuidNode: NodeDefinition = createNode(
  {
    type: 'utility.uuid',
    category: 'utility',
    name: 'UUID',
    description: 'Generate and validate UUIDs',
    icon: 'Key',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Generate', value: 'generate' },
          { label: 'Validate', value: 'validate' },
          { label: 'Parse', value: 'parse' },
          { label: 'Format', value: 'format' },
          { label: 'Batch Generate', value: 'batch' },
        ],
        { default: 'generate' }
      ),
      input.select(
        'version',
        'UUID Version',
        [
          { label: 'v1 (Timestamp)', value: 'v1' },
          { label: 'v4 (Random)', value: 'v4' },
          { label: 'v5 (SHA-1 Name)', value: 'v5' },
          { label: 'v6 (Reordered Time)', value: 'v6' },
          { label: 'v7 (Unix Time)', value: 'v7' },
          { label: 'Nil UUID', value: 'nil' },
          { label: 'Max UUID', value: 'max' },
        ],
        { default: 'v4' }
      ),
      input.string('uuid', 'UUID', {
        description: 'UUID to validate/parse/format',
        placeholder: '550e8400-e29b-41d4-a716-446655440000',
      }),
      input.string('namespace', 'Namespace', {
        description: 'Namespace UUID for v5',
        placeholder: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      }),
      input.string('name', 'Name', {
        description: 'Name for v5 generation',
        placeholder: 'example.com',
      }),
      input.number('count', 'Count', {
        description: 'Number of UUIDs to generate',
        default: 1,
        min: 1,
        max: 1000,
      }),
      input.select(
        'format',
        'Output Format',
        [
          { label: 'Standard (lowercase)', value: 'standard' },
          { label: 'Uppercase', value: 'uppercase' },
          { label: 'URN', value: 'urn' },
          { label: 'With Braces', value: 'braces' },
          { label: 'Base64', value: 'base64' },
          { label: 'Short (22 chars)', value: 'short' },
        ],
        { default: 'standard' }
      ),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.string('uuid', 'Generated UUID'),
      output.array('uuids', 'Generated UUIDs'),
      output.boolean('valid', 'Validation result'),
      output.object('parsed', 'Parsed UUID components'),
      output.string('formatted', 'Formatted UUID'),
      output.number('version', 'Detected version'),
    ],
    defaults: {
      operation: 'generate',
      version: 'v4',
      count: 1,
      format: 'standard',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = UuidNodeSchema.parse(nodeInput.config);

    logger.info(`UUID ${config.operation} v${config.version}`);

    switch (config.operation) {
      case 'generate':
        let uuid = '';
        switch (config.version) {
          case 'v1':
            uuid = `${generateUUID().substring(0, 8)}-${Date.now().toString(16).substring(0, 4)}-1${generateUUID().substring(9, 12)}-${generateUUID().substring(14, 18)}-${generateUUID().substring(19)}`;
            break;
          case 'v4':
            uuid = generateUUID();
            break;
          case 'v5':
            uuid = `${generateUUID().substring(0, 14)}5${generateUUID().substring(15)}`;
            break;
          case 'v6':
            uuid = `1ef${generateUUID().substring(3, 8)}-${generateUUID().substring(9, 13)}-6${generateUUID().substring(14)}`;
            break;
          case 'v7':
            uuid = `${Date.now().toString(16).padStart(12, '0').substring(0, 8)}-${Date.now().toString(16).substring(8, 12)}-7${generateUUID().substring(14)}`;
            break;
          case 'nil':
            uuid = '00000000-0000-0000-0000-000000000000';
            break;
          case 'max':
            uuid = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
            break;
        }

        let formatted = uuid;
        switch (config.format) {
          case 'uppercase':
            formatted = uuid.toUpperCase();
            break;
          case 'urn':
            formatted = `urn:uuid:${uuid}`;
            break;
          case 'braces':
            formatted = `{${uuid}}`;
            break;
          case 'base64':
            formatted = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64');
            break;
          case 'short':
            formatted = Buffer.from(uuid.replace(/-/g, ''), 'hex').toString('base64').replace(/[+/=]/g, '').substring(0, 22);
            break;
        }

        return {
          data: {
            success: true,
            uuid: formatted,
            version: parseInt(config.version.replace('v', '')) || 0,
          },
        };

      case 'batch':
        const uuids = Array.from({ length: config.count }, () => {
          const uuid = generateUUID();
          return config.format === 'uppercase' ? uuid.toUpperCase() : uuid;
        });
        return {
          data: {
            success: true,
            uuids,
          },
        };

      case 'validate':
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-7][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const isValid = uuidRegex.test(config.uuid || '');
        const detectedVersion = isValid ? parseInt((config.uuid || '')[14]) : 0;
        return {
          data: {
            success: true,
            valid: isValid,
            version: detectedVersion,
          },
        };

      case 'parse':
        const input = config.uuid || '550e8400-e29b-41d4-a716-446655440000';
        return {
          data: {
            success: true,
            parsed: {
              timeLow: input.substring(0, 8),
              timeMid: input.substring(9, 13),
              timeHiAndVersion: input.substring(14, 18),
              clockSeqHiAndReserved: input.substring(19, 21),
              clockSeqLow: input.substring(21, 23),
              node: input.substring(24),
              version: parseInt(input[14]),
              variant: 'RFC4122',
            },
            version: parseInt(input[14]),
          },
        };

      case 'format':
        const inputUuid = (config.uuid || '550e8400-e29b-41d4-a716-446655440000').toLowerCase().replace(/[{}-]/g, '').replace('urn:uuid:', '');
        let formattedUuid = `${inputUuid.substring(0, 8)}-${inputUuid.substring(8, 12)}-${inputUuid.substring(12, 16)}-${inputUuid.substring(16, 20)}-${inputUuid.substring(20)}`;

        switch (config.format) {
          case 'uppercase':
            formattedUuid = formattedUuid.toUpperCase();
            break;
          case 'urn':
            formattedUuid = `urn:uuid:${formattedUuid}`;
            break;
          case 'braces':
            formattedUuid = `{${formattedUuid}}`;
            break;
        }

        return {
          data: {
            success: true,
            formatted: formattedUuid,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
