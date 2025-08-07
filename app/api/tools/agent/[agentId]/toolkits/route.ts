import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableToolkits,
  getAgentEnabledToolkits,
  setAgentToolkitEnabled,
  getAgentById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
  request: Request,
  { params }: { params: { agentId: string } },
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
      return new ChatSDKError(
        'not_found:database',
        'Agent not found',
      ).toResponse();
    }

    if (agent.userId !== session.user.id && !agent.isGlobal) {
      return new ChatSDKError(
        'forbidden:chat',
        'Access denied to this agent',
      ).toResponse();
    }

    // Get available toolkits and enabled toolkits for this agent
    const availableToolkits = await getAvailableToolkits();
    const enabledToolkitNames = await getAgentEnabledToolkits(agentId);

    // Map toolkits with enabled status
    const toolkitsWithStatus = availableToolkits.map((toolkit) => ({
      ...toolkit,
      isEnabled: enabledToolkitNames.includes(toolkit.toolkitName),
    }));

    return NextResponse.json({ toolkits: toolkitsWithStatus });
  } catch (error) {
    console.error('Failed to fetch agent toolkit configuration:', error);
    return new ChatSDKError(
      'bad_request:database',
      'Failed to fetch agent toolkit configuration',
    ).toResponse();
  }
}

export async function POST(
  request: Request,
  { params }: { params: { agentId: string } },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { agentId } = await params;
    const { toolkitName, enabled } = await request.json();

    if (!toolkitName || typeof enabled !== 'boolean') {
      return new ChatSDKError(
        'bad_request:api',
        'Missing or invalid toolkitName or enabled field',
      ).toResponse();
    }

    // Verify agent ownership (global agents can't be modified by non-owners)
    const agent = await getAgentById({ id: agentId });
    if (!agent) {
      return new ChatSDKError(
        'not_found:database',
        'Agent not found',
      ).toResponse();
    }

    if (agent.userId !== session.user.id) {
      return new ChatSDKError(
        'forbidden:chat',
        'Only the agent owner can modify toolkit configuration',
      ).toResponse();
    }

    // Enable/disable all tools in the toolkit
    const toolsAffected = await setAgentToolkitEnabled(
      agentId,
      toolkitName,
      enabled,
    );

    console.log(
      `${enabled ? 'Enabled' : 'Disabled'} ${toolsAffected} tools in ${toolkitName} toolkit for agent ${agentId}`,
    );

    return NextResponse.json({
      success: true,
      toolsAffected,
      message: `${enabled ? 'Enabled' : 'Disabled'} ${toolsAffected} tools in ${toolkitName} toolkit`,
    });
  } catch (error) {
    console.error('Failed to update agent toolkit configuration:', error);
    return new ChatSDKError(
      'bad_request:database',
      'Failed to update agent toolkit configuration',
    ).toResponse();
  }
}
