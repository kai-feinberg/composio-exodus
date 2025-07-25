import { auth } from '@/app/(auth)/auth';
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
  systemPrompt: z.string().min(1).optional(),
  modelId: z.enum(['chat-model', 'chat-model-reasoning']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const agent = await getAgentById({ id: params.id });

    if (!agent) {
      return new ChatSDKError('not_found', 'Agent not found').toResponse();
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
    
    return new ChatSDKError('internal_server_error', 'Failed to get agent').toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if agent exists and user owns it
    const existingAgent = await getAgentById({ id: params.id });
    
    if (!existingAgent) {
      return new ChatSDKError('not_found', 'Agent not found').toResponse();
    }

    if (existingAgent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const json = await request.json();
    const validatedData = updateAgentSchema.parse(json);

    const agent = await updateAgent({
      id: params.id,
      ...validatedData,
    });

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new ChatSDKError('bad_request:validation', 'Invalid agent data').toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('internal_server_error', 'Failed to update agent').toResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if agent exists and user owns it
    const existingAgent = await getAgentById({ id: params.id });
    
    if (!existingAgent) {
      return new ChatSDKError('not_found', 'Agent not found').toResponse();
    }

    if (existingAgent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat').toResponse();
    }

    const agent = await deleteAgent({ id: params.id });

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('internal_server_error', 'Failed to delete agent').toResponse();
  }
}