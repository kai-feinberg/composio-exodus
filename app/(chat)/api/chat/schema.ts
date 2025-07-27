import { z } from 'zod';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(2000),
  state: z.string().optional(), // AI SDK v5 can add state
});

const filePartSchema = z.object({
  type: z.enum(['file']),
  mediaType: z.enum(['image/jpeg', 'image/png']),
  name: z.string().min(1).max(100),
  url: z.string().url(),
});

const stepStartPartSchema = z.object({
  type: z.enum(['step-start']),
});

const toolPartSchema = z.object({
  type: z.enum(['tool-createDocument', 'tool-updateDocument', 'tool-requestSuggestions', 'tool-getWeather']), // Known tool types
  toolCallId: z.string().optional(),
  state: z.enum(['partial-call', 'call', 'result', 'output-available']).optional(),
  input: z.any().optional(),
  output: z.any().optional(),
});

const partSchema = z.union([textPartSchema, filePartSchema, stepStartPartSchema, toolPartSchema]);

// AI SDK v5 request structure - body fields may or may not be at top level
const aiSdkRequestSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(z.object({
    id: z.string().uuid(),
    role: z.enum(['user', 'assistant']), // AI SDK v5 sends full conversation history
    parts: z.array(partSchema),
  })),
  // These fields from useChat body might not always be present
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning']).optional(),
  selectedVisibilityType: z.enum(['public', 'private']).optional(),
  selectedAgentId: z.string().uuid().optional(),
  trigger: z.string().optional(), // AI SDK adds this
});

// Legacy schema for backwards compatibility
export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user']),
    parts: z.array(partSchema),
  }),
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning']),
  selectedVisibilityType: z.enum(['public', 'private']),
  selectedAgentId: z.string().uuid().optional(),
});

// Export both schemas
export { aiSdkRequestSchema };

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
export type AiSdkRequestBody = z.infer<typeof aiSdkRequestSchema>;
