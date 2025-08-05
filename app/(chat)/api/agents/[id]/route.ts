import { auth } from '@/lib/auth';
import { requireOrgAdmin, getActiveOrganization } from '@/lib/organization';
import { getAgentById, updateAgent, deleteAgent } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

const updateAgentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  systemPrompt: z.string().min(1).max(300000).optional(), // 300KB limit for large prompts from DOCX files
  modelId: z.enum(['chat-model', 'chat-model-reasoning']).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check admin access
    await requireOrgAdmin();

    const orgId = await getActiveOrganization();
    if (!orgId) {
      return new ChatSDKError(
        'bad_request:api',
        'No active organization',
      ).toResponse();
    }

    const agent = await getAgentById({ id });

    if (!agent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    // Check if agent belongs to the organization
    if (agent.organizationId !== orgId) {
      return new ChatSDKError(
        'forbidden:chat',
        'Agent not found in your organization',
      ).toResponse();
    }

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message.includes('Admin access required')
    ) {
      return new ChatSDKError(
        'forbidden:api',
        'Admin access required',
      ).toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Failed to get agent',
    ).toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check admin access
    await requireOrgAdmin();

    const orgId = await getActiveOrganization();
    if (!orgId) {
      return new ChatSDKError(
        'bad_request:api',
        'No active organization',
      ).toResponse();
    }

    // Check if agent exists and belongs to organization
    const existingAgent = await getAgentById({ id });

    if (!existingAgent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    if (existingAgent.organizationId !== orgId) {
      return new ChatSDKError(
        'forbidden:chat',
        'Agent not found in your organization',
      ).toResponse();
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
      return new ChatSDKError(
        'bad_request:api',
        'Invalid agent data',
      ).toResponse();
    }

    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message.includes('Admin access required')
    ) {
      return new ChatSDKError(
        'forbidden:api',
        'Admin access required',
      ).toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Failed to update agent',
    ).toResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const session = await auth();

    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Check admin access
    await requireOrgAdmin();

    const orgId = await getActiveOrganization();
    if (!orgId) {
      return new ChatSDKError(
        'bad_request:api',
        'No active organization',
      ).toResponse();
    }

    // Check if agent exists and belongs to organization
    const existingAgent = await getAgentById({ id });

    if (!existingAgent) {
      return new ChatSDKError('not_found:chat', 'Agent not found').toResponse();
    }

    if (existingAgent.organizationId !== orgId) {
      return new ChatSDKError(
        'forbidden:chat',
        'Agent not found in your organization',
      ).toResponse();
    }

    const agent = await deleteAgent({ id });

    return Response.json({ agent }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message.includes('Admin access required')
    ) {
      return new ChatSDKError(
        'forbidden:api',
        'Admin access required',
      ).toResponse();
    }

    return new ChatSDKError(
      'bad_request:api',
      'Failed to delete agent',
    ).toResponse();
  }
}
