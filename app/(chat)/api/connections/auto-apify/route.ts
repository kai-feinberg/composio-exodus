import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import composio from '@/lib/services/composio';
import { AuthScheme } from '@composio/core';
import { ChatSDKError } from '@/lib/errors';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Check if APIFY_API_KEY is available
  if (!process.env.APIFY_API_KEY) {
    return NextResponse.json(
      { error: 'APIFY_API_KEY not found in environment variables' },
      { status: 400 }
    );
  }

  try {
    // Get Apify auth config
    const authConfigs = await composio.authConfigs.list({ toolkit: 'apify' });
    
    if (!authConfigs.items || authConfigs.items.length === 0) {
      return NextResponse.json(
        { error: 'No Apify auth configuration found' },
        { status: 400 }
      );
    }

    const apifyAuthConfig = authConfigs.items.find(
      (config: any) => config.authScheme === 'API_KEY'
    );

    if (!apifyAuthConfig) {
      return NextResponse.json(
        { error: 'No API_KEY auth configuration found for Apify' },
        { status: 400 }
      );
    }

    // Check if user already has an active Apify connection
    const existingConnections = await composio.connectedAccounts.list({
      userIds: [session.user.id],
    });

    const existingApifyConnection = existingConnections.items?.find(
      (conn: any) => 
        conn.toolkit.slug.toLowerCase() === 'apify' && 
        conn.status === 'ACTIVE'
    );

    if (existingApifyConnection) {
      return NextResponse.json({
        connectionId: existingApifyConnection.id,
        status: 'ACTIVE',
        message: 'Apify connection already exists and is active',
        isExisting: true,
      });
    }

    // Create new connection using environment API key
    const connectionRequest = await composio.connectedAccounts.initiate(
      session.user.id,
      apifyAuthConfig.id,
      {
        config: AuthScheme.APIKey({
          api_key: process.env.APIFY_API_KEY,
        }),
      }
    );

    return NextResponse.json({
      connectionId: connectionRequest.id,
      status: connectionRequest.status || 'ACTIVE',
      message: 'Apify connection established successfully using environment API key',
      isExisting: false,
    });
  } catch (error) {
    console.error('Failed to auto-connect Apify:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to auto-connect Apify',
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to auto-connect Apify' },
      { status: 500 }
    );
  }
}