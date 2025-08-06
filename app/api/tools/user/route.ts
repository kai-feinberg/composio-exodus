import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableTools,
  getUserToolPreferences,
  setUserToolEnabled,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const availableTools = await getAvailableTools();
    const userPreferences = await getUserToolPreferences(session.user.id);
    
    const toolsWithStatus = availableTools.map(tool => ({
      ...tool,
      isEnabled: userPreferences.some(pref => 
        pref.toolSlug === tool.slug && pref.isEnabled
      )
    }));

    return NextResponse.json({ tools: toolsWithStatus });
  } catch (error) {
    console.error('Failed to fetch user tool preferences:', error);
    return new ChatSDKError('bad_request:database', 'Failed to fetch user tool preferences').toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const { toolSlug, enabled } = await request.json();

    if (!toolSlug || typeof enabled !== 'boolean') {
      return new ChatSDKError('bad_request:api', 'Missing or invalid toolSlug or enabled field').toResponse();
    }

    await setUserToolEnabled(session.user.id, toolSlug, enabled);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update user tool preference:', error);
    return new ChatSDKError('bad_request:database', 'Failed to update user tool preference').toResponse();
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const { tools } = await request.json();

    if (!Array.isArray(tools)) {
      return new ChatSDKError('bad_request:api', 'Tools must be an array').toResponse();
    }

    // Bulk update user tool preferences
    for (const tool of tools) {
      if (!tool.slug || typeof tool.enabled !== 'boolean') {
        continue; // Skip invalid entries
      }
      await setUserToolEnabled(session.user.id, tool.slug, tool.enabled);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to bulk update user tool preferences:', error);
    return new ChatSDKError('bad_request:database', 'Failed to bulk update user tool preferences').toResponse();
  }
}