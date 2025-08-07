import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableToolkits,
  setAgentToolkitEnabled,
  getAgentById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

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
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return new ChatSDKError(
        'bad_request:api',
        'Missing or invalid enabled field',
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

    // Get all available toolkits
    const availableToolkits = await getAvailableToolkits();

    let totalToolsAffected = 0;
    const toolkitsAffected = [];

    // Enable/disable all toolkits
    for (const toolkit of availableToolkits) {
      const toolsAffected = await setAgentToolkitEnabled(
        agentId,
        toolkit.toolkitName,
        enabled,
      );
      totalToolsAffected += toolsAffected;
      toolkitsAffected.push({
        toolkitName: toolkit.toolkitName,
        toolsAffected,
      });
    }

    console.log(
      `Bulk ${enabled ? 'enabled' : 'disabled'} ${totalToolsAffected} tools across ${toolkitsAffected.length} toolkits for agent ${agentId}`,
    );

    return NextResponse.json({
      success: true,
      totalToolsAffected,
      toolkitsAffected,
      message: `${enabled ? 'Enabled' : 'Disabled'} ${totalToolsAffected} tools across ${toolkitsAffected.length} toolkits`,
    });
  } catch (error) {
    console.error('Failed to bulk update agent toolkit configuration:', error);
    return new ChatSDKError(
      'bad_request:database',
      'Failed to bulk update agent toolkit configuration',
    ).toResponse();
  }
}
