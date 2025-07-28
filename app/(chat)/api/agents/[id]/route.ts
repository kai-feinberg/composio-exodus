import { auth } from '@/lib/auth';
import { 
  getAgentById, 
  updateAgent, 
  deleteAgent 
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).max(100000).optional(), // 100KB limit for large prompts from DOCX files
  modelId: z.enum(['chat-model', 'chat-model-reasoning']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const agent = await getAgentById({ id });

    if (!agent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    // Check if user owns this agent
    if (agent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to get agent').toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if agent exists and user owns it
    const existingAgent = await getAgentById({ id });
    
    if (!existingAgent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    if (existingAgent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const json = await request.json();
    const validatedData = updateAgentSchema.parse(json);

    const agent = await updateAgent({
      id,
      ...validatedData,
    });

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:api', 'Invalid agent data').toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to update agent').toResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if agent exists and user owns it
    const existingAgent = await getAgentById({ id });
    
    if (!existingAgent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    if (existingAgent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const agent = await deleteAgent({ id });

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('bad_request:api', 'Failed to delete agent').toResponse();
  }
}