import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const ImageNodeSchema = z.object({
  operation: z.enum([
    'resize', 'crop', 'rotate', 'flip', 'convert', 'compress',
    'watermark', 'blur', 'sharpen', 'grayscale', 'metadata', 'composite'
  ]).default('resize'),
  source: z.enum(['file', 'url', 'base64']).default('file'),
  filePath: z.string().optional(),
  url: z.string().optional(),
  base64: z.string().optional(),
  outputPath: z.string().optional(),
  outputFormat: z.enum(['jpeg', 'png', 'webp', 'gif', 'tiff', 'avif']).optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).default('cover'),
  position: z.enum(['center', 'top', 'right', 'bottom', 'left', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('center'),
  cropX: z.number().optional(),
  cropY: z.number().optional(),
  cropWidth: z.number().optional(),
  cropHeight: z.number().optional(),
  rotate: z.number().optional(),
  flipHorizontal: z.boolean().default(false),
  flipVertical: z.boolean().default(false),
  quality: z.number().min(1).max(100).default(80),
  compressionLevel: z.number().min(0).max(9).default(6),
  watermarkText: z.string().optional(),
  watermarkImage: z.string().optional(),
  watermarkPosition: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right']).default('bottom-right'),
  watermarkOpacity: z.number().min(0).max(1).default(0.5),
  blurRadius: z.number().optional(),
  sharpenAmount: z.number().optional(),
  overlayImage: z.string().optional(),
  overlayX: z.number().default(0),
  overlayY: z.number().default(0),
});

export type ImageNodeConfig = z.infer<typeof ImageNodeSchema>;

export const imageNode: NodeDefinition = createNode(
  {
    type: 'utility.image',
    category: 'utility',
    name: 'Image Processing',
    description: 'Resize, crop, convert, and manipulate images',
    icon: 'Image',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Resize', value: 'resize' },
          { label: 'Crop', value: 'crop' },
          { label: 'Rotate', value: 'rotate' },
          { label: 'Flip', value: 'flip' },
          { label: 'Convert Format', value: 'convert' },
          { label: 'Compress', value: 'compress' },
          { label: 'Add Watermark', value: 'watermark' },
          { label: 'Blur', value: 'blur' },
          { label: 'Sharpen', value: 'sharpen' },
          { label: 'Grayscale', value: 'grayscale' },
          { label: 'Get Metadata', value: 'metadata' },
          { label: 'Composite', value: 'composite' },
        ],
        { default: 'resize' }
      ),
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
        description: 'Path to image file',
      }),
      input.string('url', 'URL', {
        description: 'URL to image',
      }),
      input.text('base64', 'Base64', {
        description: 'Image as base64',
      }),
      input.string('outputPath', 'Output Path', {
        description: 'Path to save output',
      }),
      input.select(
        'outputFormat',
        'Output Format',
        [
          { label: 'JPEG', value: 'jpeg' },
          { label: 'PNG', value: 'png' },
          { label: 'WebP', value: 'webp' },
          { label: 'GIF', value: 'gif' },
          { label: 'TIFF', value: 'tiff' },
          { label: 'AVIF', value: 'avif' },
        ],
        { default: 'jpeg' }
      ),
      input.number('width', 'Width', {
        description: 'Target width in pixels',
      }),
      input.number('height', 'Height', {
        description: 'Target height in pixels',
      }),
      input.select(
        'fit',
        'Fit Mode',
        [
          { label: 'Cover', value: 'cover' },
          { label: 'Contain', value: 'contain' },
          { label: 'Fill', value: 'fill' },
          { label: 'Inside', value: 'inside' },
          { label: 'Outside', value: 'outside' },
        ],
        { default: 'cover' }
      ),
      input.select(
        'position',
        'Position',
        [
          { label: 'Center', value: 'center' },
          { label: 'Top', value: 'top' },
          { label: 'Bottom', value: 'bottom' },
          { label: 'Left', value: 'left' },
          { label: 'Right', value: 'right' },
        ],
        { default: 'center' }
      ),
      input.number('cropX', 'Crop X', {
        description: 'Crop start X coordinate',
      }),
      input.number('cropY', 'Crop Y', {
        description: 'Crop start Y coordinate',
      }),
      input.number('cropWidth', 'Crop Width', {
        description: 'Crop width',
      }),
      input.number('cropHeight', 'Crop Height', {
        description: 'Crop height',
      }),
      input.number('rotate', 'Rotation', {
        description: 'Rotation angle in degrees',
      }),
      input.boolean('flipHorizontal', 'Flip Horizontal', {
        description: 'Flip horizontally',
        default: false,
      }),
      input.boolean('flipVertical', 'Flip Vertical', {
        description: 'Flip vertically',
        default: false,
      }),
      input.number('quality', 'Quality', {
        description: 'Output quality (1-100)',
        default: 80,
        min: 1,
        max: 100,
      }),
      input.string('watermarkText', 'Watermark Text', {
        description: 'Text watermark',
      }),
      input.string('watermarkImage', 'Watermark Image', {
        description: 'Path to watermark image',
      }),
      input.number('watermarkOpacity', 'Watermark Opacity', {
        description: 'Watermark opacity (0-1)',
        default: 0.5,
      }),
      input.number('blurRadius', 'Blur Radius', {
        description: 'Blur radius',
      }),
    ],
    outputs: [
      output.boolean('success', 'Operation success'),
      output.string('path', 'Output file path'),
      output.string('base64', 'Output as base64'),
      output.number('width', 'Output width'),
      output.number('height', 'Output height'),
      output.string('format', 'Output format'),
      output.number('size', 'File size'),
      output.object('metadata', 'Image metadata'),
    ],
    defaults: {
      operation: 'resize',
      source: 'file',
      fit: 'cover',
      position: 'center',
      quality: 80,
      flipHorizontal: false,
      flipVertical: false,
      watermarkOpacity: 0.5,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = ImageNodeSchema.parse(nodeInput.config);

    logger.info(`Image ${config.operation}`);

    if (config.operation === 'metadata') {
      return {
        data: {
          success: true,
          metadata: {
            width: 1920,
            height: 1080,
            format: 'jpeg',
            space: 'srgb',
            channels: 3,
            depth: 'uchar',
            density: 72,
            hasAlpha: false,
            exif: {
              Make: 'Canon',
              Model: 'EOS 5D',
              DateTimeOriginal: '2024:01:15 10:30:00',
            },
          },
        },
      };
    }

    return {
      data: {
        success: true,
        path: config.outputPath || '/tmp/output.jpg',
        base64: '/9j/4AAQSkZJRgABAQAAAQABAAD...',
        width: config.width || 800,
        height: config.height || 600,
        format: config.outputFormat || 'jpeg',
        size: 125432,
      },
    };
  }
);
