import { NextRequest, NextResponse } from 'next/server';
import { Composio } from 'composio-core';

function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY environment variable is not set');
  }
  
  return new Composio({
    apiKey: apiKey,
  });
}

export async function GET(request: NextRequest) {
  try {
    const composio = getComposioClient();
    
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const search = searchParams.get('search');
    const toolkits = searchParams.get('toolkits');
    const scopes = searchParams.get('scopes');
    const limit = searchParams.get('limit');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // For now, get all actions and filter client-side
    // TODO: Check if actions.list accepts parameters for filtering
    const tools = await composio.actions.list();
    
    return NextResponse.json({
      success: true,
      data: tools || []
    });
  } catch (error) {
    console.error('Failed to fetch tools:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch tools',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}