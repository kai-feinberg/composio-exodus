import { NextRequest, NextResponse } from 'next/server';
import { Composio } from 'composio-core';

function getComposioClient() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  console.log('COMPOSIO_API_KEY available:', !!apiKey);
  console.log('COMPOSIO_API_KEY length:', apiKey?.length);
  
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
    const category = searchParams.get('category');
    const isLocal = searchParams.get('isLocal');
    
    // Note: Apps list might not accept parameters, getting all apps for now
    const response = await composio.apps.list();
    
    return NextResponse.json({
      success: true,
      data: response || []
    });
  } catch (error) {
    console.error('Failed to fetch toolkits:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch toolkits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}