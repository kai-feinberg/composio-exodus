export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Grok 2 Vision',
    description: 'Primary xAI model with vision capabilities',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Grok 3 Mini (Reasoning)',
    description: 'Advanced reasoning with structured thinking',
  },
  {
    id: 'anthropic-claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    description: 'Anthropic\'s Claude 4 Sonnet model',
  },
  {
    id: 'openai-o3',
    name: 'OpenAI o3',
    description: 'OpenAI\'s o3 reasoning model',
  },
  {
    id: 'openai-gpt4-1-mini',
    name: 'GPT-4.1 Mini',
    description: 'OpenAI\'s GPT-4.1 Mini model',
  },
  {
    id: 'moonshotai-kimi-k2',
    name: 'Kimi K2',
    description: 'MoonShot AI\'s Kimi K2 model',
  },
];

// Additional models used internally
export const additionalModels = ['title-model', 'artifact-model'] as const;

// Export all supported model IDs for schema validation
export const SUPPORTED_MODEL_IDS = [
  ...chatModels.map(model => model.id),
  ...additionalModels,
] as const;

export type SupportedModelId = typeof SUPPORTED_MODEL_IDS[number];
