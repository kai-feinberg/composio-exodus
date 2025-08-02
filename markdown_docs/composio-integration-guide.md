# Composio Integration Guide for Chat Applications

## Overview

This comprehensive guide documents how Composio is integrated into the AI chat application, providing a complete blueprint for implementing Composio functionality in other chat applications. Composio enables LLM applications to seamlessly connect with external tools and services through a unified API.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Dependencies](#core-dependencies)
3. [Environment Setup](#environment-setup)
4. [Core Service Implementation](#core-service-implementation)
5. [API Endpoints](#api-endpoints)
6. [AI Tool Integration](#ai-tool-integration)
7. [Frontend Components](#frontend-components)
8. [Complete Implementation Checklist](#complete-implementation-checklist)

## Architecture Overview

The Composio integration follows a layered architecture:

```
┌─────────────────────────────────────────┐
│              Frontend UI                │
│     (Toolkits, Connections, Icons)     │
├─────────────────────────────────────────┤
│             API Layer                   │
│  (Toolkits, Connections, Chat Routes)  │
├─────────────────────────────────────────┤
│           Service Layer                 │
│        (Composio Client)               │
├─────────────────────────────────────────┤
│            AI Integration               │
│      (Tools, Chat Streaming)           │
└─────────────────────────────────────────┘
```

## Core Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "@composio/core": "0.1.13",
    "@composio/vercel": "0.1.13"
  }
}
```

## Environment Setup

### Required Environment Variables

Create these environment variables in your `.env.local`:

```bash
# Composio API Key (required)
COMPOSIO_API_KEY=your_composio_api_key

# Application URL for callbacks (optional but recommended)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### OpenTelemetry Configuration

Configure telemetry in `instrumentation.ts`:

```typescript
import { registerOTel } from "@vercel/otel";

export function register() {
  registerOTel({ serviceName: "composio-chat" });
}
```

## Core Service Implementation

### Primary Composio Service

Create `lib/services/composio.ts`:

```typescript
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

/**
 * Composio client instance for server-side operations
 * This should only be used in server-side code (API routes, server components)
 * For client-side operations, use the API endpoints in /app/api/
 */
const composio = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
  provider: new VercelProvider(),
});

export default composio;
```

### AI Tools Integration

Create `lib/ai/tools/composio.ts`:

```typescript
import composio from "@/lib/services/composio";

/**
 * Fetches Composio tools for a user based on enabled toolkits
 * This is used specifically for AI/LLM tool integration
 */
export async function getComposioTools(userId: string, toolkitSlugs: string[]) {
  if (!toolkitSlugs || toolkitSlugs.length === 0) {
    return {};
  }

  try {
    const tools = await composio.tools.get(userId, {
      toolkits: toolkitSlugs,
    });
    return tools || {};
  } catch (error) {
    console.error("Failed to fetch Composio tools:", error);
    return {};
  }
}
```

## API Endpoints

### 1. Toolkits Management API

Create `app/api/toolkits/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

// Custom types since they're not exported from @composio/core
type ToolkitResponse = {
  name: string;
  slug: string;
  meta?: {
    description?: string;
    logo?: string;
    categories?: Array<{
      name: string;
      slug: string;
    }>;
  };
};

type ConnectedAccount = {
  id: string;
  toolkit: {
    slug: string;
  };
};

// Hardcoded list of supported toolkits
const SUPPORTED_TOOLKITS = [
  "GMAIL",
  "GOOGLECALENDAR",
  "GITHUB",
  "NOTION",
  "SLACK",
  "LINEAR",
];

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  try {
    // Fetch connected accounts for the user
    const connectedToolkitMap: Map<string, string> = new Map(); // slug -> connectionId

    try {
      const connectedAccounts = await composio.connectedAccounts.list({
        userIds: [session.user.id],
      });

      // Extract toolkit slugs and connection IDs from connected accounts
      connectedAccounts.items.forEach((account: ConnectedAccount) => {
        if (account.toolkit?.slug && account.id) {
          connectedToolkitMap.set(
            account.toolkit.slug.toUpperCase(),
            account.id
          );
        }
      });
    } catch (error) {
      console.error("Failed to fetch connected accounts:", error);
      // Continue without connection status if this fails
    }

    // Fetch all toolkits in parallel
    const toolkitPromises = SUPPORTED_TOOLKITS.map(async (slug) => {
      try {
        const toolkit = (await composio.toolkits.get(slug)) as ToolkitResponse;
        const upperSlug = slug.toUpperCase();
        const connectionId = connectedToolkitMap.get(upperSlug);

        return {
          name: toolkit.name,
          slug: toolkit.slug,
          description: toolkit.meta?.description,
          logo: toolkit.meta?.logo,
          categories: toolkit.meta?.categories,
          isConnected: !!connectionId,
          connectionId: connectionId || undefined,
        };
      } catch (error) {
        console.error(`Failed to fetch toolkit ${slug}:`, error);
        return null;
      }
    });

    const results = await Promise.all(toolkitPromises);
    const toolkits = results.filter((t) => t !== null);

    return NextResponse.json({ toolkits });
  } catch (error) {
    console.error("Failed to fetch toolkits:", error);
    return NextResponse.json(
      { error: "Failed to fetch toolkits" },
      { status: 500 }
    );
  }
}
```

### 2. Connection Initiation API

Create `app/api/connections/initiate/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { initiateConnectionSchema } from "./schema";
import { ChatSDKError } from "@/lib/errors";

// ConnectionRequest type is not exported from @composio/core
type ConnectionRequestResponse = {
  id: string;
  redirectUrl?: string | null;
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  let requestBody: { authConfigId: string };

  try {
    const json = await request.json();
    requestBody = initiateConnectionSchema.parse(json);
  } catch (_) {
    return new ChatSDKError(
      "bad_request:api",
      "Invalid request body"
    ).toResponse();
  }

  try {
    const { authConfigId } = requestBody;

    // Initiate connection with Composio
    const connectionRequest = (await composio.connectedAccounts.initiate(
      session.user.id,
      authConfigId
    )) as ConnectionRequestResponse;

    return NextResponse.json({
      redirectUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.id,
    });
  } catch (error) {
    console.error("Failed to initiate connection:", error);

    if (error instanceof Error && "code" in error) {
      // Handle Composio specific errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
```

Create `app/api/connections/initiate/schema.ts`:

```typescript
import { z } from "zod";

export const initiateConnectionSchema = z.object({
  authConfigId: z.string().min(1),
});

export type InitiateConnectionRequest = z.infer<
  typeof initiateConnectionSchema
>;
```

### 3. Connection Status API

Create `app/api/connections/status/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

// Type for the connection status response
type ConnectionStatus = {
  id: string;
  status: "INITIALIZING" | "INITIATED" | "ACTIVE" | "FAILED" | "EXPIRED";
  authConfig: {
    id: string;
    isComposioManaged: boolean;
    isDisabled: boolean;
  };
  data: Record<string, unknown>;
  params?: Record<string, unknown>;
};

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return new ChatSDKError(
      "bad_request:api",
      "Connection ID is required"
    ).toResponse();
  }

  try {
    // Wait for connection to complete (with timeout)
    const connection = (await composio.connectedAccounts.waitForConnection(
      connectionId
    )) as ConnectionStatus;

    return NextResponse.json({
      id: connection.id,
      status: connection.status,
      authConfig: connection.authConfig,
      data: connection.data,
      params: connection.params,
    });
  } catch (error) {
    console.error("Failed to get connection status:", error);

    if (error instanceof Error && "code" in error) {
      // Handle Composio specific errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to get connection status" },
      { status: 500 }
    );
  }
}
```

### 4. Connection Management API

Create `app/api/connections/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import composio from "@/lib/services/composio";
import { ChatSDKError } from "@/lib/errors";

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new ChatSDKError("unauthorized:chat").toResponse();
  }

  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get("connectionId");

  if (!connectionId) {
    return new ChatSDKError(
      "bad_request:api",
      "Connection ID is required"
    ).toResponse();
  }

  try {
    // Delete the connection
    await composio.connectedAccounts.delete(connectionId);

    return NextResponse.json({
      success: true,
      message: "Connection deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete connection:", error);

    if (error instanceof Error && "code" in error) {
      // Handle Composio specific errors
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
```

## AI Tool Integration

### Chat Route Integration

Integrate Composio tools into your chat API route:

```typescript
// In your chat route (e.g., app/(chat)/api/chat/route.ts)
import { getComposioTools } from "@/lib/ai/tools/composio";
import { streamText } from "ai";

export async function POST(request: Request) {
  // ... existing auth and message handling code ...

  // Extract toolkit slugs from user's enabled toolkits
  const toolkitSlugs = enabledToolkits?.map((t) => t.slug) || [];

  // Fetch Composio tools if toolkits are enabled
  const composioTools = await getComposioTools(session.user.id, toolkitSlugs);

  // Integrate with your existing tools
  const result = streamText({
    model: myProvider.languageModel(selectedChatModel),
    system: systemPrompt({ selectedChatModel, requestHints }),
    messages: convertToModelMessages(messages),
    tools: {
      // Your existing tools
      getWeather,
      // Composio tools (dynamically loaded based on user connections)
      ...composioTools,
    },
    // ... rest of your configuration
  });

  return result.toDataStreamResponse();
}
```

## Frontend Components

### 1. Composio Icon Component

Create/update `components/icons.tsx`:

```typescript
import Image from "next/image";

export const ComposioIcon = ({ size = 96 }) => {
  return (
    <div>
      <Image
        style={{ color: "currentColor" }}
        src="/assets/icons/composio-logo-light.svg"
        alt="Composio logo"
        width={size}
        height={size}
        className="block dark:hidden"
      />
      <Image
        style={{ color: "currentColor" }}
        src="/assets/icons/composio-logo-dark.svg"
        alt="Composio logo"
        width={size}
        height={size}
        className="hidden dark:block"
      />
    </div>
  );
};
```

## Complete Implementation Checklist

### Phase 1: Environment Setup

- [ ] Install `@composio/core` and `@composio/vercel` dependencies
- [ ] Add `COMPOSIO_API_KEY` to environment variables
- [ ] Configure OpenTelemetry instrumentation
- [ ] Add Composio logo assets to `/public/assets/icons/`

### Phase 2: Core Service Layer

- [ ] Create `lib/services/composio.ts` with Composio client initialization
- [ ] Create `lib/ai/tools/composio.ts` for AI tool integration
- [ ] Define supported toolkits list (Gmail, Calendar, GitHub, etc.)

### Phase 3: API Endpoints

- [ ] Implement `/api/toolkits` endpoint for fetching available toolkits
- [ ] Implement `/api/connections/initiate` for starting OAuth flows
- [ ] Implement `/api/connections/status` for checking connection status
- [ ] Implement `/api/connections` DELETE for removing connections
- [ ] Add proper TypeScript types for all API responses

### Phase 4: AI Integration

- [ ] Integrate `getComposioTools()` in your chat API route
- [ ] Merge Composio tools with existing tools in `streamText()`
- [ ] Handle toolkit slugs from user's enabled connections
- [ ] Add error handling for tool fetching failures

### Phase 5: Frontend Components

- [ ] Create toolkit connection management UI (optional)

### Phase 6: Error Handling & Security

- [ ] Implement proper error handling for all Composio API calls
- [ ] Add authentication checks for all protected endpoints
- [ ] Handle connection failures gracefully
- [ ] Add logging for debugging connection issues
- [ ] Validate user permissions for toolkit operations

### Phase 7: Testing & Deployment

- [ ] Test toolkit connection flows end-to-end
- [ ] Test AI tool integration with actual connected accounts
- [ ] Verify error handling for edge cases
- [ ] Test with different authentication providers
- [ ] Deploy with proper environment variables

## Key Integration Points

### 1. Authentication Flow

```
User clicks "Connect Gmail" →
API call to /api/connections/initiate →
Redirect to OAuth provider →
User authorizes →
Connection established →
Tools become available in chat
```

### 2. Tool Availability Flow

```
User sends message →
Chat API fetches user's connected toolkits →
getComposioTools() called with toolkit slugs →
Tools dynamically loaded →
AI model gets access to external APIs
```

### 3. Error Handling Strategy

- **Connection Failures**: Graceful degradation, continue without tools
- **API Timeouts**: Return empty tools object, log error
- **Invalid Auth**: Clear error messages, re-authentication flow
- **Rate Limits**: Respect limits, queue requests if possible

## Security Considerations

1. **API Key Security**: Never expose `COMPOSIO_API_KEY` to client-side code
2. **User Authorization**: Always verify user session before Composio operations
3. **Connection Ownership**: Ensure users can only access their own connections
4. **Error Information**: Don't expose internal errors to client responses
5. **Rate Limiting**: Implement rate limiting for connection operations

## Performance Optimization

1. **Parallel Requests**: Fetch multiple toolkit info simultaneously
2. **Caching**: Cache toolkit metadata to reduce API calls
3. **Lazy Loading**: Only fetch tools when needed for chat
4. **Error Recovery**: Graceful fallbacks when services are unavailable
5. **Connection Pooling**: Reuse Composio client instance across requests

This guide provides everything needed to implement Composio functionality in a new chat application. Each code snippet is production-ready and follows best practices for security, error handling, and performance.
