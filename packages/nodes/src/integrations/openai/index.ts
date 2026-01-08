import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const OpenaiSchema = z.object({
  operation: z.enum(['chat', 'completion', 'embedding', 'image', 'transcribe']).default('chat'),
  model: z.string().default('gpt-4'),
  prompt: z.string().optional(),
  messages: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
  maxTokens: z.number().default(1000),
  temperature: z.number().default(0.7),
  imagePrompt: z.string().optional(),
  imageSize: z.enum(['256x256', '512x512', '1024x1024']).default('1024x1024'),
});

export const openaiNode: NodeDefinition = createNode(
  {
    type: 'integration.openai',
    category: 'integration',
    name: 'OpenAI',
    description: 'Generate text, images, and embeddings with OpenAI',
    icon: 'Bot',
    inputs: [
      input.select('operation', 'Operation', [
        { label: 'Chat Completion', value: 'chat' },
        { label: 'Text Completion', value: 'completion' },
        { label: 'Create Embedding', value: 'embedding' },
        { label: 'Generate Image', value: 'image' },
        { label: 'Transcribe Audio', value: 'transcribe' },
      ], { default: 'chat' }),
      input.select('model', 'Model', [
        { label: 'GPT-4', value: 'gpt-4' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo-preview' },
        { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
      ], { default: 'gpt-4' }),
      input.string('prompt', 'Prompt', { description: 'Text prompt' }),
      input.json('messages', 'Messages', { description: 'Chat messages array' }),
      input.number('maxTokens', 'Max Tokens', { default: 1000 }),
      input.number('temperature', 'Temperature', { default: 0.7 }),
      input.string('imagePrompt', 'Image Prompt', { description: 'Prompt for image generation' }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    credentials: ['api_key'],
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = OpenaiSchema.parse(nodeInput.config);
    const credentials = nodeInput.credentials;

    logger.info(`OpenAI: ${config.operation}`);

    if (!credentials?.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const headers = {
      'Authorization': `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
    };

    let response: Response;
    let result: Record<string, unknown>;

    switch (config.operation) {
      case 'chat':
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: config.model,
            messages: config.messages || [{ role: 'user', content: config.prompt }],
            max_tokens: config.maxTokens,
            temperature: config.temperature,
          }),
        });
        result = await response.json() as Record<string, unknown>;
        return {
          data: {
            content: (result as any).choices?.[0]?.message?.content || '',
            response: result,
          },
        };

      case 'embedding':
        response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'text-embedding-ada-002',
            input: config.prompt,
          }),
        });
        result = await response.json() as Record<string, unknown>;
        return {
          data: {
            embedding: (result as any).data?.[0]?.embedding || [],
            response: result,
          },
        };

      case 'image':
        response = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: config.imagePrompt || config.prompt,
            n: 1,
            size: config.imageSize,
          }),
        });
        result = await response.json() as Record<string, unknown>;
        return {
          data: {
            imageUrl: (result as any).data?.[0]?.url || '',
            response: result,
          },
        };

      default:
        throw new Error(`Operation ${config.operation} not implemented`);
    }
  }
);
