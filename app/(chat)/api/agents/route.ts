import { auth } from '@/lib/auth';
import { 
  createAgent, 
  getAgentsByUserId 
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).max(100000), // 100KB limit for large prompts from DOCX files
  modelId: z.enum(['chat-model', 'chat-model-reasoning']),
});

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const agents = await getAgentsByUserId({ userId: session.user.id });

    return Response.json({ agents }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to get agents').toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const json = await request.json();
    const validatedData = createAgentSchema.parse(json);

    const agent = await createAgent({
      ...validatedData,
      userId: session.user.id,
    });

    return Response.json({ agent }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', 'Invalid agent data').toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to create agent').toResponse();
  }
}