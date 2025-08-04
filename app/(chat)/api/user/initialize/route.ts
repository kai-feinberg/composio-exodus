import { auth, ensureUserExists } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, organizationId } = body;

    // Verify the userId matches the authenticated user
    if (userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await ensureUserExists(userId, organizationId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to initialize user:', error);
    return NextResponse.json(
      { error: 'Failed to initialize user' }, 
      { status: 500 }
    );
  }
}