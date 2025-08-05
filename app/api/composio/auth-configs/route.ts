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
    const toolkit = searchParams.get('toolkit');
    
    // Get all connected accounts for now
    const response = await composio.connectedAccounts.list({});
    
    return NextResponse.json({
      success: true,
      data: response || []
    });
  } catch (error) {
    console.error('Failed to fetch auth configs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch auth configs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}