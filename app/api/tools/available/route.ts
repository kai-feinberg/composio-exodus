import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getAvailableTools,
  addAvailableTool,
  updateAvailableTool,
  deleteAvailableTool,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    const availableTools = await getAvailableTools();
    return NextResponse.json({ tools: availableTools });
  } catch (error) {
    console.error('Failed to fetch available tools:', error);
    return new ChatSDKError('bad_request:database', 'Failed to fetch available tools').toResponse();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // TODO: Add admin check when admin roles are implemented
    // For now, only allow users to add tools (in the future, this might be admin-only)

    const { slug, toolkitSlug, toolkitName, displayName, description } = await request.json();

    if (!slug || !toolkitSlug || !toolkitName) {
      return new ChatSDKError('bad_request:api', 'Missing required fields: slug, toolkitSlug, toolkitName').toResponse();
    }

    await addAvailableTool({
      slug,
      toolkitSlug,
      toolkitName,
      displayName,
      description,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to add available tool:', error);
    return new ChatSDKError('bad_request:database', 'Failed to add available tool').toResponse();
  }
}