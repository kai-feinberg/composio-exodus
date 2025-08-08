import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import composio from '@/lib/services/composio';
import { AuthScheme } from '@composio/core';
import { ChatSDKError } from '@/lib/errors';
import { z } from 'zod';

// Type for toolkit field definitions
interface ToolkitField {
  name: string;
  displayName: string;
  type: string;
  default?: string | null;
  required?: boolean;
}

const apiKeyConnectionSchema = z.object({
  authConfigId: z.string().min(1),
  apiKey: z.string().min(1),
  apiUrl: z.string().optional(), // For toolkits like ActiveCampaign that need API URL
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  let requestBody: { authConfigId: string; apiKey: string; apiUrl?: string };

  try {
    const json = await request.json();
    requestBody = apiKeyConnectionSchema.parse(json);
  } catch (_) {
    return new ChatSDKError(
      'bad_request:api',
      'Invalid request body. Both authConfigId and apiKey are required.',
    ).toResponse();
  }

  try {
    let { authConfigId, apiKey, apiUrl } = requestBody;

    // First, get the auth config to determine the toolkit
    const authConfigDetails = await composio.authConfigs.get(authConfigId);
    const toolkitSlug = authConfigDetails.toolkit.slug;

    // Auto-configure Apify with environment API key if available
    if (toolkitSlug.toLowerCase() === 'apify' && process.env.APIFY_API_KEY) {
      apiKey = process.env.APIFY_API_KEY;
      console.log('Using APIFY_API_KEY from environment for Apify toolkit');
    }

    // Get required fields for this toolkit's API key authentication
    const requiredFields: ToolkitField[] =
      await composio.toolkits.getConnectedAccountInitiationFields(
        toolkitSlug,
        'API_KEY',
        { requiredOnly: true },
      );

    // Build the configuration object with all required fields
    const apiKeyConfig: Record<string, string> = {};

    // Handle toolkit-specific field mappings
    if (toolkitSlug === 'active_campaign') {
      // ActiveCampaign uses specific field names
      apiKeyConfig.generic_api_key = apiKey;
      
      if (apiUrl) {
        apiKeyConfig.full = apiUrl;
      } else {
        throw new Error('API URL is required for ActiveCampaign');
      }
    } else if (toolkitSlug.toLowerCase() === 'apify') {
      // Apify uses specific field names
      apiKeyConfig.api_key = apiKey;
      
      // Add any additional required fields with their default values
      requiredFields.forEach((field) => {
        if (field.name !== 'api_key' && field.default !== null) {
          apiKeyConfig[field.name] = field.default;
        }
      });
    } else {
      // Default mapping for other toolkits
      apiKeyConfig.api_key = apiKey;
      
      // Add any additional required fields with their default values
      requiredFields.forEach((field) => {
        if (field.name !== 'api_key' && field.default !== null) {
          apiKeyConfig[field.name] = field.default;
        }
      });
    }

    console.log('Toolkit:', toolkitSlug);
    console.log('Required fields:', requiredFields);
    console.log('API key config:', apiKeyConfig);

    // Use correct Composio SDK format for API key authentication
    const connectionRequest = await composio.connectedAccounts.initiate(
      session.user.id,
      authConfigId,
      {
        config: AuthScheme.APIKey(apiKeyConfig),
      },
    );

    // API Key authentication is immediate - no redirect needed
    return NextResponse.json({
      connectionId: connectionRequest.id,
      status: connectionRequest.status || 'ACTIVE',
      message: 'API key connection established successfully',
    });
  } catch (error) {
    console.error('Failed to connect with API key:', error);

    if (error instanceof Error) {
      // Handle Composio specific errors
      if ('code' in error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to connect with API key' },
      { status: 500 },
    );
  }
}
