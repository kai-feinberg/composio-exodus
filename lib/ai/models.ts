export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Claude Sonnet 4',
    description: "Anthropic's Claude Sonnet 4 model",
  },
];

// Additional models used internally
export const additionalModels = ['title-model', 'artifact-model'] as const;

// Export all supported model IDs for schema validation
export const SUPPORTED_MODEL_IDS = [
  ...chatModels.map((model) => model.id),
  ...additionalModels,
] as const;

export type SupportedModelId = (typeof SUPPORTED_MODEL_IDS)[number];
