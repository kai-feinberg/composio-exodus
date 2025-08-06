import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { setAgentToolkitEnabled, getAgentById } from '@/lib/db/queries';
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

    const { agentId } = await params;
    const { enabledToolkits } = await request.json();

    if (!Array.isArray(enabledToolkits)) {
      return new ChatSDKError(
        'bad_request:api',
        'enabledToolkits must be an array',
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

    let totalToolsAffected = 0;
    const toolkitsAffected = [];

    // Enable the specified toolkits
    for (const toolkitName of enabledToolkits) {
      if (typeof toolkitName === 'string') {
        const toolsAffected = await setAgentToolkitEnabled(
          agentId,
          toolkitName,
          true,
        );
        totalToolsAffected += toolsAffected;
        toolkitsAffected.push({
          toolkitName,
          toolsAffected,
        });
      }
    }

    console.log(
      `Copied ${totalToolsAffected} tools from ${toolkitsAffected.length} user toolkits to agent ${agentId}`,
    );

    return NextResponse.json({
      success: true,
      totalToolsAffected,
      toolkitsAffected,
      message: `Copied ${totalToolsAffected} tools from ${toolkitsAffected.length} user toolkits`,
    });
  } catch (error) {
    console.error('Failed to copy user toolkit configuration:', error);
    return new ChatSDKError(
      'bad_request:database',
      'Failed to copy user toolkit configuration',
    ).toResponse();
  }
}
