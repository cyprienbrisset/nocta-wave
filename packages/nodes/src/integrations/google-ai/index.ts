import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const GoogleAINodeSchema = z.object({
  operation: z.enum(['generateContent', 'chat', 'embedContent', 'countTokens']).default('generateContent'),
  model: z.enum(['gemini-pro', 'gemini-pro-vision', 'gemini-ultra', 'gemini-1.5-pro', 'gemini-1.5-flash']).default('gemini-1.5-pro'),
  prompt: z.string().optional(),
  systemInstruction: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({ text: z.string() })),
  })).optional(),
  maxOutputTokens: z.number().min(1).max(8192).default(1024),
  temperature: z.number().min(0).max(2).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(1).optional(),
  stopSequences: z.array(z.string()).optional(),
  safetySettings: z.array(z.object({
    category: z.string(),
    threshold: z.string(),
  })).optional(),
  credentialId: z.string().optional(),
});

export type GoogleAINodeConfig = z.infer<typeof GoogleAINodeSchema>;

export const googleAINode: NodeDefinition = createNode(
  {
    type: 'integration.google-ai',
    category: 'integration',
    name: 'Google AI (Gemini)',
    description: 'Generate content with Google Gemini AI models',
    icon: 'Sparkles',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Generate Content', value: 'generateContent' },
          { label: 'Multi-turn Chat', value: 'chat' },
          { label: 'Generate Embeddings', value: 'embedContent' },
          { label: 'Count Tokens', value: 'countTokens' },
        ],
        { default: 'generateContent' }
      ),
      input.select(
        'model',
        'Model',
        [
          { label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro' },
          { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash' },
          { label: 'Gemini Pro', value: 'gemini-pro' },
          { label: 'Gemini Pro Vision', value: 'gemini-pro-vision' },
          { label: 'Gemini Ultra', value: 'gemini-ultra' },
        ],
        { default: 'gemini-1.5-pro' }
      ),
      input.text('prompt', 'Prompt', {
        description: 'Input prompt for generation',
        placeholder: 'Enter your prompt...',
      }),
      input.text('systemInstruction', 'System Instruction', {
        description: 'System-level instructions for the model',
        placeholder: 'You are a helpful assistant...',
      }),
      input.array('messages', 'Chat History', {
        description: 'Previous messages for multi-turn chat',
        itemType: 'object',
      }),
      input.number('maxOutputTokens', 'Max Output Tokens', {
        description: 'Maximum tokens in the response',
        default: 1024,
        min: 1,
        max: 8192,
      }),
      input.number('temperature', 'Temperature', {
        description: 'Randomness of output (0-2)',
        default: 0.7,
        min: 0,
        max: 2,
      }),
      input.number('topP', 'Top P', {
        description: 'Nucleus sampling parameter',
        min: 0,
        max: 1,
      }),
      input.number('topK', 'Top K', {
        description: 'Top K sampling parameter',
        min: 1,
      }),
      input.array('stopSequences', 'Stop Sequences', {
        description: 'Sequences that stop generation',
        itemType: 'string',
      }),
      input.credential('credentialId', 'Google AI API Key', {
        description: 'Google AI Studio API key',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [
      output.string('text', 'Generated text'),
      output.array('candidates', 'Response candidates'),
      output.array('embedding', 'Text embedding vector'),
      output.number('tokenCount', 'Token count'),
      output.object('usageMetadata', 'Usage statistics'),
      output.string('finishReason', 'Finish reason'),
    ],
    defaults: {
      operation: 'generateContent',
      model: 'gemini-1.5-pro',
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = GoogleAINodeSchema.parse(nodeInput.config);

    logger.info(`Google AI ${config.operation} with model: ${config.model}`);

    switch (config.operation) {
      case 'generateContent':
      case 'chat':
        return {
          data: {
            text: `Simulated response from ${config.model}. In production, this would be the actual generated content.`,
            candidates: [
              {
                content: {
                  parts: [{ text: 'Simulated response' }],
                  role: 'model',
                },
                finishReason: 'STOP',
                index: 0,
              },
            ],
            usageMetadata: {
              promptTokenCount: (config.prompt?.length || 0) / 4,
              candidatesTokenCount: 50,
              totalTokenCount: (config.prompt?.length || 0) / 4 + 50,
            },
            finishReason: 'STOP',
          },
        };

      case 'embedContent':
        // Generate a simulated embedding vector
        const embedding = Array.from({ length: 768 }, () => Math.random() * 2 - 1);
        return {
          data: {
            embedding,
            tokenCount: (config.prompt?.length || 0) / 4,
          },
        };

      case 'countTokens':
        return {
          data: {
            tokenCount: Math.ceil((config.prompt?.length || 0) / 4),
          },
        };

      default:
        return { data: { error: 'Unknown operation' } };
    }
  }
);
