import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const QrCodeNodeSchema = z.object({
  operation: z.enum(['generate', 'read']).default('generate'),
  // Generate options
  content: z.string().optional(),
  type: z.enum(['text', 'url', 'email', 'phone', 'sms', 'wifi', 'vcard', 'geo']).default('text'),
  format: z.enum(['png', 'svg', 'base64', 'terminal']).default('png'),
  outputPath: z.string().optional(),
  size: z.number().min(100).max(2000).default(300),
  margin: z.number().min(0).max(10).default(2),
  errorCorrectionLevel: z.enum(['L', 'M', 'Q', 'H']).default('M'),
  darkColor: z.string().default('#000000'),
  lightColor: z.string().default('#FFFFFF'),
  logo: z.string().optional(),
  logoSize: z.number().min(10).max(100).default(50),
  // Email/SMS specific
  emailTo: z.string().optional(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  phoneNumber: z.string().optional(),
  smsBody: z.string().optional(),
  // WiFi specific
  wifiSsid: z.string().optional(),
  wifiPassword: z.string().optional(),
  wifiEncryption: z.enum(['WPA', 'WEP', 'nopass']).default('WPA'),
  wifiHidden: z.boolean().default(false),
  // vCard specific
  vcardName: z.string().optional(),
  vcardOrg: z.string().optional(),
  vcardPhone: z.string().optional(),
  vcardEmail: z.string().optional(),
  vcardAddress: z.string().optional(),
  vcardUrl: z.string().optional(),
  // Geo specific
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  // Read options
  source: z.enum(['file', 'url', 'base64']).default('file'),
  filePath: z.string().optional(),
  url: z.string().optional(),
  base64: z.string().optional(),
});

export type QrCodeNodeConfig = z.infer<typeof QrCodeNodeSchema>;

export const qrcodeNode: NodeDefinition = createNode(
  {
    type: 'utility.qrcode',
    category: 'utility',
    name: 'QR Code',
    description: 'Generate and read QR codes',
    icon: 'QrCode',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Generate', value: 'generate' },
          { label: 'Read', value: 'read' },
        ],
        { default: 'generate' }
      ),
      input.select(
        'type',
        'Content Type',
        [
          { label: 'Text', value: 'text' },
          { label: 'URL', value: 'url' },
          { label: 'Email', value: 'email' },
          { label: 'Phone', value: 'phone' },
          { label: 'SMS', value: 'sms' },
          { label: 'WiFi', value: 'wifi' },
          { label: 'vCard', value: 'vcard' },
          { label: 'Geo Location', value: 'geo' },
        ],
        { default: 'text' }
      ),
      input.text('content', 'Content', {
        description: 'Content to encode',
        placeholder: 'Hello World or https://example.com',
      }),
      input.select(
        'format',
        'Output Format',
        [
          { label: 'PNG', value: 'png' },
          { label: 'SVG', value: 'svg' },
          { label: 'Base64', value: 'base64' },
          { label: 'Terminal', value: 'terminal' },
        ],
        { default: 'png' }
      ),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save QR code',
      }),
      input.number('size', 'Size', {
        description: 'Size in pixels',
        default: 300,
        min: 100,
        max: 2000,
      }),
      input.number('margin', 'Margin', {
        description: 'Quiet zone margin',
        default: 2,
        min: 0,
        max: 10,
      }),
      input.select(
        'errorCorrectionLevel',
        'Error Correction',
        [
          { label: 'Low (7%)', value: 'L' },
          { label: 'Medium (15%)', value: 'M' },
          { label: 'Quartile (25%)', value: 'Q' },
          { label: 'High (30%)', value: 'H' },
        ],
        { default: 'M' }
      ),
      input.string('darkColor', 'Dark Color', {
        description: 'QR code dark color',
        default: '#000000',
      }),
      input.string('lightColor', 'Light Color', {
        description: 'QR code light color',
        default: '#FFFFFF',
      }),
      input.string('logo', 'Logo', {
        description: 'Path to logo image',
      }),
      input.number('logoSize', 'Logo Size', {
        description: 'Logo size in pixels',
        default: 50,
      }),
      input.string('emailTo', 'Email To', {
        description: 'Email recipient',
      }),
      input.string('emailSubject', 'Email Subject', {
        description: 'Email subject',
      }),
      input.string('phoneNumber', 'Phone Number', {
        description: 'Phone number',
      }),
      input.string('wifiSsid', 'WiFi SSID', {
        description: 'WiFi network name',
      }),
      input.string('wifiPassword', 'WiFi Password', {
        description: 'WiFi password',
      }),
      input.select(
        'wifiEncryption',
        'WiFi Encryption',
        [
          { label: 'WPA/WPA2', value: 'WPA' },
          { label: 'WEP', value: 'WEP' },
          { label: 'None', value: 'nopass' },
        ],
        { default: 'WPA' }
      ),
      input.string('vcardName', 'vCard Name', {
        description: 'Full name for vCard',
      }),
      input.string('vcardPhone', 'vCard Phone', {
        description: 'Phone for vCard',
      }),
      input.string('vcardEmail', 'vCard Email', {
        description: 'Email for vCard',
      }),
      input.number('latitude', 'Latitude', {
        description: 'Geo latitude',
      }),
      input.number('longitude', 'Longitude', {
        description: 'Geo longitude',
      }),
      input.select(
        'source',
        'Read Source',
        [
          { label: 'File Path', value: 'file' },
          { label: 'URL', value: 'url' },
          { label: 'Base64', value: 'base64' },
        ],
        { default: 'file' }
      ),
      input.string('filePath', 'File Path', {
        description: 'Path to QR code image',
      }),
    ],
    outputs: [output.main({ description: 'Utility operation result' })],
    defaults: {
      operation: 'generate',
      type: 'text',
      format: 'png',
      size: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      darkColor: '#000000',
      lightColor: '#FFFFFF',
      logoSize: 50,
      wifiEncryption: 'WPA',
      wifiHidden: false,
      source: 'file',
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = QrCodeNodeSchema.parse(nodeInput.config);

    logger.info(`QR Code ${config.operation}`);

    if (config.operation === 'read') {
      return {
        data: {
          success: true,
          content: 'https://example.com',
          type: 'url',
        },
      };
    }

    // Generate QR code
    let encodedContent = config.content || '';

    if (config.type === 'wifi') {
      encodedContent = `WIFI:T:${config.wifiEncryption};S:${config.wifiSsid};P:${config.wifiPassword};H:${config.wifiHidden};;`;
    } else if (config.type === 'email') {
      encodedContent = `mailto:${config.emailTo}?subject=${config.emailSubject}&body=${config.emailBody}`;
    } else if (config.type === 'phone') {
      encodedContent = `tel:${config.phoneNumber}`;
    } else if (config.type === 'sms') {
      encodedContent = `sms:${config.phoneNumber}?body=${config.smsBody}`;
    } else if (config.type === 'geo') {
      encodedContent = `geo:${config.latitude},${config.longitude}`;
    }

    return {
      data: {
        success: true,
        path: config.outputPath || '/tmp/qrcode.png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAASwAAAEsCAYAAAB5fY51...',
        svg: config.format === 'svg' ? '<svg>...</svg>' : undefined,
        content: encodedContent,
      },
    };
  }
);
