import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableTools,
  getAgentToolConfiguration,
  setAgentToolEnabled,
  getAgentById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { agentId } = await params;

    // Verify agent ownership or global access
    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError('not_found:database', 'Agent not found').toResponse();
    }

    if (agent.userId !== session.user.id && !agent.isGlobal) {
      return new ChatSDKError('forbidden:chat', 'Access denied to this agent').toResponse();
    }

    const availableTools = await getAvailableTools();
    const agentConfiguration = await getAgentToolConfiguration(agentId);
    
    const toolsWithStatus = availableTools.map(tool => ({
      ...tool,
      isEnabled: agentConfiguration.some(config => 
        config.toolSlug === tool.slug && config.isEnabled
      )
    }));

    return NextResponse.json({ tools: toolsWithStatus });
  } catch (error) {
    console.error('Failed to fetch agent tool configuration:', error);
    return new ChatSDKError('bad_request:database', 'Failed to fetch agent tool configuration').toResponse();
  }
}

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { agentId } = await params;
    const { toolSlug, enabled } = await request.json();

    if (!toolSlug || typeof enabled !== 'boolean') {
      return new ChatSDKError('bad_request:api', 'Missing or invalid toolSlug or enabled field').toResponse();
    }

    // Verify agent ownership (global agents can't be modified by non-owners)
    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError('not_found:database', 'Agent not found').toResponse();
    }

    if (agent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat', 'Only the agent owner can modify tool configuration').toResponse();
    }

    await setAgentToolEnabled(agentId, toolSlug, enabled);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update agent tool configuration:', error);
    return new ChatSDKError('bad_request:database', 'Failed to update agent tool configuration').toResponse();
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { agentId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { agentId } = await params;
    const { tools } = await request.json();

    if (!Array.isArray(tools)) {
      return new ChatSDKError('bad_request:api', 'Tools must be an array').toResponse();
    }

    // Verify agent ownership
    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError('not_found:database', 'Agent not found').toResponse();
    }

    if (agent.userId !== session.user.id) {
      return new ChatSDKError('forbidden:chat', 'Only the agent owner can modify tool configuration').toResponse();
    }

    // Bulk update agent tool configuration
    for (const tool of tools) {
      if (!tool.slug || typeof tool.enabled !== 'boolean') {
        continue; // Skip invalid entries
      }
      await setAgentToolEnabled(agentId, tool.slug, tool.enabled);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to bulk update agent tool configuration:', error);
    return new ChatSDKError('bad_request:database', 'Failed to bulk update agent tool configuration').toResponse();
  }
}