import { auth } from '@/app/(auth)/auth';
import { 
  createAgent, 
  getAgentsByUserId 
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { DEFAULT_AGENTS } from '@/lib/types/agent';

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check if user already has agents
    const existingAgents = await getAgentsByUserId({ userId: session.user.id });
    
    if (existingAgents.length > 0) {
      return Response.json({ 
        message: 'User already has agents',
        agents: existingAgents 
      }, { status: 200 });
    }

    // Create default agents for the user
    const createdAgents = [];
    
    for (const defaultAgent of DEFAULT_AGENTS) {
      const agent = await createAgent({
        ...defaultAgent,
        userId: session.user.id,
      });
      createdAgents.push(agent);
    }

    return Response.json({ 
      message: 'Default agents created',
      agents: createdAgents 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }
    
    return new ChatSDKError('internal_server_error', 'Failed to initialize agents').toResponse();
  }
}