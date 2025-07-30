import { auth } from '@/lib/auth';
import { getActiveOrganization } from '@/lib/organization';
import { getAgentsByUserId } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const orgId = await getActiveOrganization();
    if (!orgId) {
      return new ChatSDKError('bad_request:api', 'No active organization').toResponse();
    }

    // Get agents scoped to the organization
    const allAgents = await getAgentsByUserId({ userId: session.user.id, organizationId: orgId });

    // Filter out sensitive information (system prompts) for non-admin users
    const publicAgents = allAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      modelId: agent.modelId,
      userId: agent.userId,
      organizationId: agent.organizationId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      // systemPrompt is intentionally excluded for security
    }));

    return Response.json({ agents: publicAgents }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Failed to get agents',
    ).toResponse();
  }
}