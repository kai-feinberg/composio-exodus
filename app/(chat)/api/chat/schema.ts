import { z } from 'zod';
import { SUPPORTED_MODEL_IDS } from '@/lib/ai/models';

const textPartSchema = z.object({
  type: z.enum(['text']),
  text: z.string().min(1).max(50000), // Increased from 2000 to handle large tool results and content
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
  type: z
    .string()
    .refine((val) => val.startsWith('tool-'), {
      message: 'Tool type must start with "tool-"',
    }), // Accept any tool that starts with 'tool-' (built-in + Composio tools)
  toolCallId: z.string().optional(),
  state: z
    .enum(['partial-call', 'call', 'result', 'output-available'])
    .optional(),
  input: z.any().optional(),
  output: z.any().optional(),
});

const partSchema = z.union([
  textPartSchema,
  filePartSchema,
  stepStartPartSchema,
  toolPartSchema,
]);

// AI SDK v5 request structure - body fields may or may not be at top level
const aiSdkRequestSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.enum(['user', 'assistant']), // AI SDK v5 sends full conversation history
      parts: z.array(partSchema),
      metadata: z
        .object({
          createdAt: z.string().optional(),
        })
        .optional(), // AI SDK can include metadata with timestamps
    }),
  ),
  // These fields from useChat body might not always be present
  selectedChatModel: z
    .string()
    .refine((val) => SUPPORTED_MODEL_IDS.includes(val as any), {
      message: `Must be one of: ${SUPPORTED_MODEL_IDS.join(', ')}`,
    })
    .optional(),
  selectedVisibilityType: z.enum(['public', 'private']).optional(),
  selectedAgentId: z.string().uuid().optional(),
  trigger: z.string().optional(), // AI SDK adds this
});

// Export the AI SDK v2 schema
export { aiSdkRequestSchema };

export type AiSdkRequestBody = z.infer<typeof aiSdkRequestSchema>;
