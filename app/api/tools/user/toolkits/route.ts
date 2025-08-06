import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableToolkits,
  getUserToolPreferences,
  getAvailableTools,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // Get available toolkits
    const availableToolkits = await getAvailableToolkits();

    // Get user enabled tools to determine which toolkits are fully enabled
    const userEnabledTools = await getUserToolPreferences(session.user.id);
    const enabledToolSlugs = userEnabledTools
      .filter((tool) => tool.isEnabled)
      .map((tool) => tool.toolSlug);

    // Get all available tools to map slugs to toolkits
    const allTools = await getAvailableTools();

    // Group tools by toolkit
    const toolsByToolkit = allTools.reduce(
      (acc, tool) => {
        if (!acc[tool.toolkitName]) {
          acc[tool.toolkitName] = [];
        }
        acc[tool.toolkitName].push(tool.slug);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    // Determine which toolkits are fully enabled for the user
    const toolkitsWithStatus = availableToolkits.map((toolkit) => {
      const toolkitTools = toolsByToolkit[toolkit.toolkitName] || [];
      const enabledToolkitTools = toolkitTools.filter((slug) =>
        enabledToolSlugs.includes(slug),
      );

      return {
        ...toolkit,
        isEnabled:
          toolkitTools.length > 0 &&
          enabledToolkitTools.length === toolkitTools.length,
      };
    });

    return NextResponse.json({ toolkits: toolkitsWithStatus });
  } catch (error) {
    console.error('Failed to fetch user toolkit configuration:', error);
    return new ChatSDKError(
      'bad_request:database',
      'Failed to fetch user toolkit configuration',
    ).toResponse();
  }
}
