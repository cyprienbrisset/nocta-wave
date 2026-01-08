import { z } from 'zod';
import { createNode, input, output } from '../../create-node';
import type { NodeDefinition } from '@ws-flows/shared';

export const AnthropicNodeSchema = z.object({
  operation: z.enum(['chat', 'complete', 'stream']).default('chat'),
  model: z.enum(['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022']).default('claude-3-5-sonnet-20241022'),
  systemPrompt: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(),
  prompt: z.string().optional(),
  maxTokens: z.number().min(1).max(4096).default(1024),
  temperature: z.number().min(0).max(1).default(0.7),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().min(0).optional(),
  stopSequences: z.array(z.string()).optional(),
  credentialId: z.string().optional(),
});

export type AnthropicNodeConfig = z.infer<typeof AnthropicNodeSchema>;

export const anthropicNode: NodeDefinition = createNode(
  {
    type: 'integration.anthropic',
    category: 'integration',
    name: 'Anthropic Claude',
    description: 'Generate text and chat completions with Claude AI',
    icon: 'Bot',
    inputs: [
      input.select(
        'operation',
        'Operation',
        [
          { label: 'Chat Completion', value: 'chat' },
          { label: 'Text Completion', value: 'complete' },
          { label: 'Streaming Chat', value: 'stream' },
        ],
        { default: 'chat' }
      ),
      input.select(
        'model',
        'Model',
        [
          { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet-20241022' },
          { label: 'Claude 3 Opus', value: 'claude-3-opus-20240229' },
          { label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229' },
          { label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307' },
        ],
        { default: 'claude-3-5-sonnet-20241022' }
      ),
      input.text('systemPrompt', 'System Prompt', {
        description: 'System instructions for the model',
        placeholder: 'You are a helpful assistant...',
      }),
      input.array('messages', 'Messages', {
        description: 'Conversation history (for chat operation)',
        itemType: 'object',
      }),
      input.text('prompt', 'Prompt', {
        description: 'User prompt or message',
        placeholder: 'Enter your prompt here...',
        required: true,
      }),
      input.number('maxTokens', 'Max Tokens', {
        description: 'Maximum tokens in the response',
        default: 1024,
        min: 1,
        max: 4096,
      }),
      input.number('temperature', 'Temperature', {
        description: 'Randomness of the output (0-1)',
        default: 0.7,
        min: 0,
        max: 1,
      }),
      input.number('topP', 'Top P', {
        description: 'Nucleus sampling parameter',
        min: 0,
        max: 1,
      }),
      input.number('topK', 'Top K', {
        description: 'Top K sampling parameter',
        min: 0,
      }),
      input.array('stopSequences', 'Stop Sequences', {
        description: 'Sequences that stop generation',
        itemType: 'string',
      }),
      input.credential('credentialId', 'Anthropic API Key', {
        description: 'Anthropic API credentials',
        credentialTypes: ['API_KEY'],
        required: true,
      }),
    ],
    outputs: [output.main({ description: 'API operation result' })],
    defaults: {
      operation: 'chat',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
      temperature: 0.7,
    },
  },
  async (nodeInput, context) => {
    const { logger } = context;
    const config = AnthropicNodeSchema.parse(nodeInput.config);

    logger.info(`Anthropic ${config.operation} with model: ${config.model}`);

    // In real implementation, this would call the Anthropic API
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Simulate a response
    const response = {
      id: messageId,
      type: 'message',
      role: 'assistant',
      content: `This is a simulated response from ${config.model}. In production, this would contain the actual AI-generated content based on your prompt.`,
      model: config.model,
      stop_reason: 'end_turn',
      usage: {
        input_tokens: (config.prompt?.length || 0) / 4,
        output_tokens: 50,
      },
    };

    return {
      data: {
        content: response.content,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        stopReason: response.stop_reason,
        id: response.id,
      },
    };
  }
);
