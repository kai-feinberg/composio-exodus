# Selective Composio Tool Loading System - Implementation Plan

## Overview

This document outlines the implementation of a selective Composio tool loading system that allows users and agents to have specific tool configurations, moving away from loading entire toolkits to loading only desired tools.

### Key Requirements
- Store specific tool slugs in database with toolkit associations
- Enable tool selection at user level (for general/user agent usage)
- Enable tool selection at agent level (for specific agent configurations)
- No inheritance complexity - tools come from user OR agent context
- Leverage Composio's native tool filtering by slug
- Manual curation of available tools to filter out unwanted ones

## Database Schema

### Available Tools (Master Catalog)
```sql
CREATE TABLE "AvailableTools" (
  "slug" varchar(100) PRIMARY KEY NOT NULL,
  "toolkitSlug" varchar(100) NOT NULL,
  "toolkitName" varchar(100) NOT NULL,
  "displayName" varchar(200),
  "description" text,
  "isActive" boolean DEFAULT true NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
```

**Purpose**: Master catalog of manually curated tools that can be enabled by users/agents.

### User Tools (User-Level Preferences)
```sql
CREATE TABLE "UserTools" (
  "userId" varchar(255) NOT NULL REFERENCES "User"("id"),
  "toolSlug" varchar(100) NOT NULL REFERENCES "AvailableTools"("slug"),
  "isEnabled" boolean DEFAULT true NOT NULL,
  "enabledAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("userId", "toolSlug")
);
```

**Purpose**: Stores which tools are enabled for each user. Used when user is using general/default agent.

### Agent Tools (Agent-Specific Configuration)
```sql
CREATE TABLE "AgentTools" (
  "agentId" uuid NOT NULL REFERENCES "Agent"("id"),
  "toolSlug" varchar(100) NOT NULL REFERENCES "AvailableTools"("slug"),
  "isEnabled" boolean DEFAULT true NOT NULL,
  "enabledAt" timestamp DEFAULT now() NOT NULL,
  PRIMARY KEY ("agentId", "toolSlug")
);
```

**Purpose**: Stores which tools are enabled for specific agents. Takes precedence over user tools when agent is specified.

### Drizzle Schema Implementation

```typescript
// Add to lib/db/schema.ts

export const availableTools = pgTable('AvailableTools', {
  slug: varchar('slug', { length: 100 }).primaryKey().notNull(),
  toolkitSlug: varchar('toolkitSlug', { length: 100 }).notNull(),
  toolkitName: varchar('toolkitName', { length: 100 }).notNull(),
  displayName: varchar('displayName', { length: 200 }),
  description: text('description'),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').notNull().defaultNow(),
  updatedAt: timestamp('updatedAt').notNull().defaultNow(),
});

export type AvailableTool = InferSelectModel<typeof availableTools>;

export const userTools = pgTable('UserTools', {
  userId: varchar('userId', { length: 255 })
    .notNull()
    .references(() => user.id),
  toolSlug: varchar('toolSlug', { length: 100 })
    .notNull()
    .references(() => availableTools.slug),
  isEnabled: boolean('isEnabled').notNull().default(true),
  enabledAt: timestamp('enabledAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.toolSlug] }),
}));

export type UserTool = InferSelectModel<typeof userTools>;

export const agentTools = pgTable('AgentTools', {
  agentId: uuid('agentId')
    .notNull()
    .references(() => agent.id),
  toolSlug: varchar('toolSlug', { length: 100 })
    .notNull()
    .references(() => availableTools.slug),
  isEnabled: boolean('isEnabled').notNull().default(true),
  enabledAt: timestamp('enabledAt').notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.agentId, table.toolSlug] }),
}));

export type AgentTool = InferSelectModel<typeof agentTools>;
```

## Core Function Modifications

### Updated getComposioTools Function

Location: `lib/ai/tools/composio.ts`

```typescript
/**
 * Fetches Composio tools for a user based on their tool preferences or agent configuration
 * Now supports selective tool loading by slug
 */
export async function getComposioTools(
  userId: string,
  options?: {
    agentId?: string;
    requestedToolkits?: string[];
  }
) {
  try {
    // Get connected toolkits first
    const connectedToolkits = await getConnectedToolkits(userId);
    if (connectedToolkits.length === 0) {
      return {};
    }

    // Get enabled tools based on context (agent vs user)
    let enabledToolSlugs: string[] = [];
    
    if (options?.agentId) {
      // Get agent-specific tools
      enabledToolSlugs = await getEnabledToolsForAgent(options.agentId);
    } else {
      // Get user-level tools for general usage
      enabledToolSlugs = await getEnabledToolsForUser(userId);
    }

    if (enabledToolSlugs.length === 0) {
      console.log(`No tools enabled for ${options?.agentId ? `agent ${options.agentId}` : `user ${userId}`}`);
      return {};
    }

    // Use Composio's native tool filtering by slug
    const firstConnectionId = connectedToolkits[0]?.connectionId;
    const rawTools = await composio.tools.get(userId, {
      tools: enabledToolSlugs, // Filter by specific tool slugs
      ...(firstConnectionId && { connectedAccountId: firstConnectionId }),
    });

    // Filter out tools from disconnected toolkits
    const toolkitConnectionMap: Record<string, string> = {};
    connectedToolkits.forEach((tk: any) => {
      toolkitConnectionMap[tk.toolkit] = tk.connectionId;
    });

    // Validate and fix each tool schema
    const validatedTools: Record<string, any> = {};
    
    for (const [toolName, tool] of Object.entries(rawTools)) {
      const validatedTool = validateAndFixToolSchema(tool);
      if (validatedTool) {
        const toolkitName = toolName.split('_')[0];
        const connectionId = toolkitConnectionMap[toolkitName];
        
        if (connectionId) {
          validatedTool.connectedAccountId = connectionId;
          validatedTools[toolName] = validatedTool;
        } else {
          console.warn(`Tool ${toolName} skipped - toolkit ${toolkitName} not connected`);
        }
      }
    }

    console.log(`📦 [Composio] Successfully loaded ${Object.keys(validatedTools).length} tools`);
    return validatedTools;

  } catch (error) {
    console.error('❌ [Composio] Failed to fetch tools:', error);
    return {};
  }
}
```

### Database Query Functions

Location: `lib/db/queries.ts`

```typescript
// Tool management queries

export async function getEnabledToolsForUser(userId: string): Promise<string[]> {
  const enabledTools = await db
    .select({ toolSlug: userTools.toolSlug })
    .from(userTools)
    .where(and(
      eq(userTools.userId, userId),
      eq(userTools.isEnabled, true)
    ));
  
  return enabledTools.map(tool => tool.toolSlug);
}

export async function getEnabledToolsForAgent(agentId: string): Promise<string[]> {
  const enabledTools = await db
    .select({ toolSlug: agentTools.toolSlug })
    .from(agentTools)
    .where(and(
      eq(agentTools.agentId, agentId),
      eq(agentTools.isEnabled, true)
    ));
  
  return enabledTools.map(tool => tool.toolSlug);
}

export async function getAvailableTools(): Promise<AvailableTool[]> {
  return await db
    .select()
    .from(availableTools)
    .where(eq(availableTools.isActive, true))
    .orderBy(availableTools.displayName);
}

export async function getUserToolPreferences(userId: string): Promise<UserTool[]> {
  return await db
    .select()
    .from(userTools)
    .where(eq(userTools.userId, userId));
}

export async function getAgentToolConfiguration(agentId: string): Promise<AgentTool[]> {
  return await db
    .select()
    .from(agentTools)
    .where(eq(agentTools.agentId, agentId));
}

// Tool management mutations

export async function setUserToolEnabled(userId: string, toolSlug: string, enabled: boolean) {
  await db
    .insert(userTools)
    .values({ userId, toolSlug, isEnabled: enabled })
    .onConflictDoUpdate({
      target: [userTools.userId, userTools.toolSlug],
      set: { isEnabled: enabled, enabledAt: new Date() }
    });
}

export async function setAgentToolEnabled(agentId: string, toolSlug: string, enabled: boolean) {
  await db
    .insert(agentTools)
    .values({ agentId, toolSlug, isEnabled: enabled })
    .onConflictDoUpdate({
      target: [agentTools.agentId, agentTools.toolSlug],
      set: { isEnabled: enabled, enabledAt: new Date() }
    });
}

export async function addAvailableTool(tool: {
  slug: string;
  toolkitSlug: string;
  toolkitName: string;
  displayName?: string;
  description?: string;
}) {
  await db.insert(availableTools).values(tool);
}
```

### Chat API Integration

Location: `app/(chat)/api/chat/route.ts`

```typescript
// Update the existing getComposioTools call to include agent context

export async function POST(request: Request) {
  // ... existing code ...

  try {
    // Get agent context if specified
    const agentId = body.agentId; // Assuming this comes from request body
    
    // Fetch user's tools with agent context
    let composioTools = {};
    try {
      console.log(`🔄 Loading Composio tools for user: ${session.user.id}${agentId ? `, agent: ${agentId}` : ''}`);
      composioTools = await getComposioTools(session.user.id, { agentId });
      const toolNames = Object.keys(composioTools);
      console.log(`✅ Loaded ${toolNames.length} tools:`, toolNames.slice(0, 5));
    } catch (error) {
      console.error('❌ Failed to load Composio tools:', error);
    }

    // ... rest of existing code ...
  }
}
```

## API Endpoints

### Available Tools Management

**GET /api/tools/available**
- Returns list of curated available tools
- Used for tool discovery in UI

**POST /api/tools/available** (Admin only)
- Add new tools to available catalog
- Body: `{ slug, toolkitSlug, toolkitName, displayName?, description? }`

**PUT /api/tools/available/:slug** (Admin only)
- Update tool information or toggle active status

**DELETE /api/tools/available/:slug** (Admin only)
- Remove tool from catalog

### User Tool Preferences

**GET /api/tools/user**
- Returns user's current tool preferences
- Shows enabled/disabled status for each available tool

**POST /api/tools/user**
- Update user tool preferences
- Body: `{ toolSlug: string, enabled: boolean }`

**PUT /api/tools/user/bulk**
- Bulk update user tool preferences
- Body: `{ tools: Array<{slug: string, enabled: boolean}> }`

### Agent Tool Configuration

**GET /api/tools/agent/:agentId**
- Returns agent's current tool configuration
- Shows enabled/disabled status for each available tool

**POST /api/tools/agent/:agentId**
- Update agent tool configuration
- Body: `{ toolSlug: string, enabled: boolean }`

**PUT /api/tools/agent/:agentId/bulk**
- Bulk update agent tool configuration
- Body: `{ tools: Array<{slug: string, enabled: boolean}> }`

### Implementation Example

```typescript
// app/api/tools/user/route.ts
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const availableTools = await getAvailableTools();
  const userPreferences = await getUserToolPreferences(session.user.id);
  
  const toolsWithStatus = availableTools.map(tool => ({
    ...tool,
    isEnabled: userPreferences.some(pref => 
      pref.toolSlug === tool.slug && pref.isEnabled
    )
  }));

  return NextResponse.json({ tools: toolsWithStatus });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { toolSlug, enabled } = await request.json();
  await setUserToolEnabled(session.user.id, toolSlug, enabled);
  
  return NextResponse.json({ success: true });
}
```

## Management UI Requirements

### User Tools Configuration Page

**Location**: `app/(chat)/tools/user/page.tsx`

**Features**:
- Display all available tools grouped by toolkit name (e.g., "Twitter", "YouTube", "Gmail")
- Toggle switches for enable/disable
- Search and filter functionality
- Bulk enable/disable by toolkit
- Tool descriptions and usage hints
- Collapsible toolkit sections

**UI Components Needed**:
- ToolCard component with toggle
- ToolkitSection component for grouping by toolkitName
- SearchFilter component
- BulkActions component

**Example UI Structure**:
```
📧 Gmail (3 tools)
  ├─ Send Email [toggle]
  ├─ Read Emails [toggle] 
  └─ Create Draft [toggle]

🐦 Twitter (2 tools)
  ├─ Post Tweet [toggle]
  └─ Bookmark Tweet [toggle]

📺 YouTube (1 tool)
  └─ Search Videos [toggle]
```

### Agent Tool Configuration Interface

**Location**: Agent settings page or modal

**Features**:
- Same interface as user tools but scoped to agent
- Copy from user defaults option
- Clear visual indication of agent-specific tools
- Save/cancel functionality

### Admin Tool Management

**Location**: `app/(admin)/tools/page.tsx`

**Features**:
- Add new tools to catalog
- Edit existing tool information
- Toggle tool availability globally
- Import tools from Composio API
- Usage analytics per tool

## Implementation Timeline

### Week 1: Foundation
- [ ] Add database schema and run migration
- [ ] Implement database query functions
- [ ] Update getComposioTools function
- [ ] Basic API endpoints for tool management

### Week 2: Integration & APIs
- [ ] Complete all API endpoints
- [ ] Update chat API to use agent context
- [ ] Error handling and validation
- [ ] Basic testing of tool loading

### Week 3: UI Development
- [ ] User tool configuration page
- [ ] Agent tool configuration interface
- [ ] Admin tool management interface
- [ ] Polish and testing

### Week 4: Testing & Refinement
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Edge case handling
- [ ] Documentation and deployment

## Success Metrics

1. **Performance**: Tool loading time should improve by reducing unnecessary tools
2. **Flexibility**: Users can configure tools per agent without inheritance complexity
3. **Maintainability**: Clean separation of concerns with clear data model
4. **User Experience**: Intuitive interface for tool selection and management
5. **Reliability**: Graceful handling of missing tools or connection issues

## Future Enhancements

- Tool usage analytics and recommendations
- Tool categories and tagging system
- Export/import tool configurations
- Tool permission and access control
- Integration with organization-level tool policies