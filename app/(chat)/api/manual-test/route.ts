import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import composio from '@/lib/services/composio';
import { ChatSDKError } from '@/lib/errors';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  try {
    console.log('=== GMAIL_FETCH_EMAILS DEBUG START ===');
    console.log('User ID:', session.user.id);
    console.log('Arguments:', { maxResults: 1, query: 'in:inbox' });

    // Use Composio's GMAIL_FETCH_EMAILS tool to get the latest email
    const result = await composio.tools.execute('GMAIL_FETCH_EMAILS', {
      userId: session.user.id,
      arguments: {
        maxResults: 1,
        query: 'in:inbox',
      },
    });

    // console.log('=== FULL COMPOSIO RESPONSE ===');
    // console.log('Result successful:', result.successful);
    // console.log('Result error:', result.error);
    // console.log('Result data type:', typeof result.data);
    // console.log('Result data structure:', result.data);

    // Check if we have messages in the response
    const hasMessages =
      result.data &&
      typeof result.data === 'object' &&
      'messages' in result.data &&
      Array.isArray((result.data as any).messages);

    // console.log('Has messages:', hasMessages);
    // if (hasMessages) {
    //   console.log('Messages count:', (result.data as any).messages.length);
    // }
    // console.log('=== DEBUG END ===');

    if (
      result.successful &&
      hasMessages &&
      (result.data as any).messages.length > 0
    ) {
      const data = result.data as any;
      return NextResponse.json({
        success: true,
        email: data.messages[0],
        allEmails: data.messages,
        emailCount: data.messages.length,
        nextPageToken: data.nextPageToken,
        resultSizeEstimate: data.resultSizeEstimate,
      });
    }

    return NextResponse.json({
      success: false,
      message: result.error || 'No emails found in inbox',
      debug: {
        successful: result.successful,
        error: result.error,
        hasMessages,
        dataStructure: result.data,
      },
    });
  } catch (error) {
    console.error('Gmail fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch email via Composio execute',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
