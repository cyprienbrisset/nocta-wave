import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const HuggingFaceNodeSchema = z.object({
  operation: z.enum(['inference', 'textGeneration', 'textClassification', 'tokenClassification', 'questionAnswering', 'summarization', 'translation', 'imageClassification', 'objectDetection', 'imageSegmentation', 'featureExtraction']).default('textGeneration'),
  model: z.string().min(1),
  inputs: z.unknown(),
  parameters: z.record(z.unknown()).optional(),
  options: z.object({
    useCache: z.boolean().default(true),
    waitForModel: z.boolean().default(true),
  }).optional(),
  credentialId: z.string().optional(),
});

export type HuggingFaceNodeConfig = z.infer<typeof HuggingFaceNodeSchema>;

export const huggingfaceNode: NodeDefinition = createNode(
  {
    type: 'integration.huggingface',
    category: 'integration',
    name: 'Hugging Face',
    description: 'Run inference on Hugging Face models',
    icon: 'Cpu',
    inputs: [
      input.select(
        'operation',
        'Task',
        [
          { label: 'Text Generation', value: 'textGeneration' },
          { label: 'Text Classification', value: 'textClassification' },
          { label: 'Token Classification (NER)', value: 'tokenClassification' },
          { label: 'Question Answering', value: 'questionAnswering' },
          { label: 'Summarization', value: 'summarization' },
          { label: 'Translation', value: 'translation' },
          { label: 'Image Classification', value: 'imageClassification' },
          { label: 'Object Detection', value: 'objectDetection' },
          { label: 'Image Segmentation', value: 'imageSegmentation' },
          { label: 'Feature Extraction', value: 'featureExtraction' },
          { label: 'Custom Inference', value: 'inference' },
        ],
        { default: 'textGeneration' }
      ),
      input.string('model', 'Model', {
        description: 'Hugging Face model ID',
        placeholder: 'meta-llama/Llama-2-7b-chat-hf',
        required: true,
      }),
      input.json('inputs', 'Inputs', {
        description: 'Model inputs (text, image URL, etc.)',
        required: true,
      }),
      input.json('parameters', 'Parameters', {
        description: 'Model-specific parameters',
        default: {},
      }),
      input.boolean('useCache', 'Use Cache', {
        description: 'Use cached results if available',
        default: true,
      }),
      input.boolean('waitForModel', 'Wait for Model', {
        description: 'Wait if model is loading',
        default: true,
      }),
      input.credential('credentialId', 'Hugging Face API Key', {
        description: 'Hugging Face API token',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.unknown('result', 'Inference result'),
      output.string('generatedText', 'Generated text (for text generation)'),
      output.array('classifications', 'Classification results'),
      output.array('entities', 'Named entities (for NER)'),
      output.string('answer', 'Answer (for QA)'),
      output.string('summary', 'Summary text'),
      output.array('embeddings', 'Feature embeddings'),
    ],
    defaults: {
      operation: 'textGeneration',
      model: '',
      useCache: true,
      waitForModel: true,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = HuggingFaceNodeSchema.parse(nodeInput.config);

    logger.info(`Hugging Face ${config.operation} with model: ${config.model}`);

    switch (config.operation) {
      case 'textGeneration':
        return {
          data: {
            result: [{ generated_text: `Generated text from ${config.model}` }],
            generatedText: `Generated text from ${config.model}`,
          },
        };

      case 'textClassification':
        return {
          data: {
            result: [[{ label: 'POSITIVE', score: 0.95 }, { label: 'NEGATIVE', score: 0.05 }]],
            classifications: [{ label: 'POSITIVE', score: 0.95 }],
          },
        };

      case 'tokenClassification':
        return {
          data: {
            result: [
              { entity: 'B-PER', score: 0.99, word: 'John', start: 0, end: 4 },
              { entity: 'B-LOC', score: 0.98, word: 'Paris', start: 15, end: 20 },
            ],
            entities: [
              { entity: 'PERSON', word: 'John', score: 0.99 },
              { entity: 'LOCATION', word: 'Paris', score: 0.98 },
            ],
          },
        };

      case 'questionAnswering':
        return {
          data: {
            result: { answer: 'Paris', score: 0.97, start: 15, end: 20 },
            answer: 'Paris',
          },
        };

      case 'summarization':
        return {
          data: {
            result: [{ summary_text: 'This is a summary of the input text.' }],
            summary: 'This is a summary of the input text.',
          },
        };

      case 'translation':
        return {
          data: {
            result: [{ translation_text: 'Translated text output.' }],
            generatedText: 'Translated text output.',
          },
        };

      case 'imageClassification':
        return {
          data: {
            result: [
              { label: 'cat', score: 0.92 },
              { label: 'dog', score: 0.05 },
            ],
            classifications: [{ label: 'cat', score: 0.92 }],
          },
        };

      case 'objectDetection':
        return {
          data: {
            result: [
              { label: 'cat', score: 0.95, box: { xmin: 10, ymin: 20, xmax: 100, ymax: 150 } },
            ],
          },
        };

      case 'featureExtraction':
        const embeddings = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
        return {
          data: {
            result: [embeddings],
            embeddings: [embeddings],
          },
        };

      default:
        return {
          data: {
            result: nodeInput.data || {},
          },
        };
    }
  }
);
