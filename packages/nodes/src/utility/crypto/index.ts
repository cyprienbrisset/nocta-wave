import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';
import * as crypto from 'crypto';

export const CryptoSchema = z.object({
  operation: z.enum(['hash', 'hmac', 'encrypt', 'decrypt', 'randomBytes', 'uuid']).default('hash'),
  algorithm: z.enum(['md5', 'sha1', 'sha256', 'sha512']).default('sha256'),
  input: z.string().optional(),
  key: z.string().optional(),
  encoding: z.enum(['hex', 'base64']).default('hex'),
  length: z.number().default(32),
});

export const cryptoNode: NodeDefinition = createNode(
  {
    type: 'utility.crypto',
    category: 'utility',
    name: 'Crypto',
    description: 'Hash, encrypt, decrypt, and generate random data',
    icon: 'Lock',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Hash', value: 'hash' },
        { label: 'HMAC', value: 'hmac' },
        { label: 'Generate Random Bytes', value: 'randomBytes' },
        { label: 'Generate UUID', value: 'uuid' },
      ], { default: 'hash' }),
      input.select('algorithm', 'Algorithm', [
        { label: 'SHA-256', value: 'sha256' },
        { label: 'SHA-512', value: 'sha512' },
        { label: 'SHA-1', value: 'sha1' },
        { label: 'MD5', value: 'md5' },
      ], { default: 'sha256' }),
      input.string('input', 'Input', { description: 'Data to hash or encrypt' }),
      input.string('key', 'Key', { description: 'Secret key (for HMAC)' }),
      input.select('encoding', 'Output Encoding', [
        { label: 'Hex', value: 'hex' },
        { label: 'Base64', value: 'base64' },
      ], { default: 'hex' }),
      input.number('length', 'Length', { default: 32, description: 'Random bytes length' }),
    ],
    outputs: [output.string('result', 'Crypto operation result')],
    defaults: { operation: 'hash', algorithm: 'sha256', encoding: 'hex', length: 32 },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = CryptoSchema.parse(nodeInput.config);

    logger.info(`Crypto: ${config.operation}`);

    let result: string;

    switch (config.operation) {
      case 'hash':
        result = crypto.createHash(config.algorithm).update(config.input || '').digest(config.encoding);
        break;
      case 'hmac':
        result = crypto.createHmac(config.algorithm, config.key || '').update(config.input || '').digest(config.encoding);
        break;
      case 'randomBytes':
        result = crypto.randomBytes(config.length).toString(config.encoding);
        break;
      case 'uuid':
        result = crypto.randomUUID();
        break;
      default:
        throw new Error(`Unknown operation: ${config.operation}`);
    }

    return { data: { result } };
  }
);
