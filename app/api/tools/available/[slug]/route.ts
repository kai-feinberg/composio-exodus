import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateAvailableTool, deleteAvailableTool } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function PUT(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // TODO: Add admin check when admin roles are implemented

    const { displayName, description, isActive } = await request.json();
    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { slug } = await params;

    const updatedTool = await updateAvailableTool(slug, {
      displayName,
      description,
      isActive,
    });

    if (!updatedTool) {
      return new ChatSDKError('not_found:database', 'Tool not found').toResponse();
    }

    return NextResponse.json({ tool: updatedTool });
  } catch (error) {
    console.error('Failed to update available tool:', error);
    return new ChatSDKError('bad_request:database', 'Failed to update available tool').toResponse();
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    // TODO: Add admin check when admin roles are implemented

    // Next.js 15 requires awaiting params before accessing properties
    // This is against typical best practices but required for proper function
    const { slug } = await params;
    const deletedTool = await deleteAvailableTool(slug);

    if (!deletedTool) {
      return new ChatSDKError('not_found:database', 'Tool not found').toResponse();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete available tool:', error);
    return new ChatSDKError('bad_request:database', 'Failed to delete available tool').toResponse();
  }
}