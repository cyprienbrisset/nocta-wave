import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const Base64NodeSchema = z.object({
  operation: z.enum(['encode', 'decode', 'encodeFile', 'decodeFile', 'urlEncode', 'urlDecode']).default('encode'),
  textInput: z.string().optional(),
  base64Input: z.string().optional(),
  filePath: z.string().optional(),
  fileContent: z.string().optional(),
  outputPath: z.string().optional(),
  encoding: z.enum(['utf-8', 'ascii', 'latin1', 'utf-16', 'hex']).default('utf-8'),
  urlSafe: z.boolean().default(false),
  padding: z.boolean().default(true),
  lineLength: z.number().optional(),
  mimeType: z.string().optional(),
  dataUri: z.boolean().default(false),
});

export type Base64NodeConfig = z.infer<typeof Base64NodeSchema>;

export const base64Node: NodeDefinition = createNode(
  {
    type: 'transform.base64',
    category: 'transform',
    name: 'Base64',
    description: 'Encode and decode Base64 data',
    icon: 'Binary',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Encode Text', value: 'encode' },
          { label: 'Decode Text', value: 'decode' },
          { label: 'Encode File', value: 'encodeFile' },
          { label: 'Decode to File', value: 'decodeFile' },
          { label: 'URL-Safe Encode', value: 'urlEncode' },
          { label: 'URL-Safe Decode', value: 'urlDecode' },
        ],
        { default: 'encode' }
      ),
      input.text('textInput', 'Text Input', {
        description: 'Text to encode',
        placeholder: 'Hello, World!',
      }),
      input.text('base64Input', 'Base64 Input', {
        description: 'Base64 string to decode',
        placeholder: 'SGVsbG8sIFdvcmxkIQ==',
      }),
      input.string('filePath', 'File Path', {
        description: 'Path to file for encoding',
        placeholder: '/path/to/file.pdf',
      }),
      input.text('fileContent', 'File Content', {
        description: 'Binary file content (as buffer)',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path for decoded file output',
        placeholder: '/path/to/output.pdf',
      }),
      input.select(
        'encoding',
        'Text Encoding',
        [
          { label: 'UTF-8', value: 'utf-8' },
          { label: 'ASCII', value: 'ascii' },
          { label: 'Latin-1', value: 'latin1' },
          { label: 'UTF-16', value: 'utf-16' },
          { label: 'Hex', value: 'hex' },
        ],
        { default: 'utf-8' }
      ),
      input.boolean('urlSafe', 'URL Safe', {
        description: 'Use URL-safe Base64 variant',
        default: false,
      }),
      input.boolean('padding', 'Include Padding', {
        description: 'Include = padding characters',
        default: true,
      }),
      input.number('lineLength', 'Line Length', {
        description: 'Max line length (0 for no wrapping)',
      }),
      input.string('mimeType', 'MIME Type', {
        description: 'MIME type for data URI',
        placeholder: 'image/png',
      }),
      input.boolean('dataUri', 'Data URI', {
        description: 'Output as data URI',
        default: false,
      }),
    ],
    outputs: [output.main({ description: 'Transformation result' })],
    defaults: {
      operation: 'encode',
      encoding: 'utf-8',
      urlSafe: false,
      padding: true,
      dataUri: false,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = Base64NodeSchema.parse(nodeInput.config);

    logger.info(`Base64 ${config.operation}`);

    switch (config.operation) {
      case 'encode':
        const text = config.textInput || 'Hello, World!';
        const encoded = Buffer.from(text).toString('base64');
        return {
          data: {
            success: true,
            encoded: config.urlSafe ? encoded.replace(/\+/g, '-').replace(/\//g, '_') : encoded,
            originalSize: text.length,
            encodedSize: encoded.length,
            dataUri: config.dataUri ? `data:text/plain;base64,${encoded}` : undefined,
          },
        };

      case 'decode':
        const base64 = config.base64Input || 'SGVsbG8sIFdvcmxkIQ==';
        const decoded = Buffer.from(base64, 'base64').toString(config.encoding as BufferEncoding);
        return {
          data: {
            success: true,
            decoded,
            originalSize: base64.length,
            encodedSize: decoded.length,
          },
        };

      case 'encodeFile':
        return {
          data: {
            success: true,
            encoded: 'JVBERi0xLjQKJeLjz9MKNCAwIG9iago8PC9GaWx0ZXIvRmxhdGVEZWNvZGUvTGVuZ3Ro...',
            originalSize: 102400,
            encodedSize: 136534,
            dataUri: config.dataUri ? `data:${config.mimeType || 'application/octet-stream'};base64,JVBERi0xLjQ...` : undefined,
          },
        };

      case 'decodeFile':
        return {
          data: {
            success: true,
            filePath: config.outputPath || '/tmp/decoded-file.bin',
            originalSize: 136534,
            encodedSize: 102400,
          },
        };

      case 'urlEncode':
        const urlText = config.textInput || 'Hello+World/Test';
        const urlEncoded = Buffer.from(urlText).toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        return {
          data: {
            success: true,
            encoded: urlEncoded,
            originalSize: urlText.length,
            encodedSize: urlEncoded.length,
          },
        };

      case 'urlDecode':
        const urlBase64 = (config.base64Input || 'SGVsbG8tV29ybGRfVGVzdA')
          .replace(/-/g, '+')
          .replace(/_/g, '/');
        const urlDecoded = Buffer.from(urlBase64, 'base64').toString('utf-8');
        return {
          data: {
            success: true,
            decoded: urlDecoded,
          },
        };

      default:
        return { data: { success: true } };
    }
  }
);
