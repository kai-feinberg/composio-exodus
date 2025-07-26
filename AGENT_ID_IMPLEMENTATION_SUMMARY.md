# Agent ID Implementation Summary

## Overview

This document provides a comprehensive summary of implementing agent ID functionality in the Horde AI chat system. The goal was to pass a selected agent ID from the client to the server, fetch the corresponding agent's system prompt from the database, and apply it to the AI model to change its behavior dynamically.

## Problem Statement

The application needed to support multiple AI agents with different personalities and behaviors. Users should be able to:

1. Select different agents from a dropdown
2. Switch agents mid-conversation without losing context
3. Have the AI respond according to the selected agent's system prompt
4. Maintain conversation history while switching agents

## Technical Architecture

### Database Schema

The agent system was already implemented with the following schema:

```sql
CREATE TABLE "Agent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "systemPrompt" text NOT NULL,
  "modelId" varchar(50) DEFAULT 'chat-model' NOT NULL,
  "userId" uuid NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);
```

### Key Components

1. **Client-Side**: React components for agent selection and message sending
2. **API Layer**: Next.js API route for handling chat requests
3. **Database**: PostgreSQL with Drizzle ORM for agent storage
4. **AI Integration**: AI SDK v5 for streaming chat functionality

## Implementation Approach

### Phase 1: Initial Analysis

**Finding**: The agent functionality was already partially implemented:

- ✅ Database schema and queries existed
- ✅ API route already extracted `selectedAgentId` from request
- ✅ Agent system prompt was already being applied
- ❌ Client-side wasn't properly passing the agent ID

### Phase 2: Client-Side Implementation

#### Problem: AI SDK v5 Request Body Configuration

The main challenge was figuring out how to pass custom fields in AI SDK v5 requests. Multiple approaches were attempted:

**Attempt 1: Transport-based approach**

```typescript
// ❌ This didn't work - transport captures values at creation time
transport: new DefaultChatTransport({
  api: '/api/chat',
  body: () => ({
    selectedAgentId: currentAgentId, // Stale closure issue
  }),
}),
```

**Attempt 2: experimental_prepareRequestBody**

```typescript
// ❌ This didn't work - not available in current AI SDK version
experimental_prepareRequestBody: ({ messages, chatId }) => ({
  selectedAgentId: currentAgentId,
}),
```

**Attempt 3: Per-request body fields (SUCCESS)**

```typescript
// ✅ This worked - AI SDK v5's intended approach
sendMessage(
  {
    role: "user",
    parts: [{ type: "text", text: input }],
  },
  {
    body: {
      selectedAgentId: selectedAgentId, // Captured at request time
    },
  }
);
```

#### Solution: Per-Request Body Fields

The breakthrough came from the AI SDK v5 documentation showing that custom body fields can be passed per request:

```typescript
// From AI SDK v5 docs
sendMessage(
  { text: input },
  {
    body: {
      customKey: "customValue",
    },
  }
);
```

### Phase 3: Component Updates

#### 1. Chat Component (`components/chat.tsx`)

**Key Changes:**

- Removed `DefaultChatTransport` approach
- Added `getCurrentAgentId()` function for dynamic agent ID retrieval
- Updated `sendMessage` calls to include custom body fields
- Added proper prop passing to child components

**State Management:**

```typescript
// Function to get current agent ID dynamically
const getCurrentAgentId = () => {
  if (selectedAgentId) {
    return selectedAgentId;
  }
  if (agentsData?.agents && agentsData.agents.length > 0) {
    return agentsData.agents[0].id;
  }
  return undefined;
};
```

#### 2. Multimodal Input Component (`components/multimodal-input.tsx`)

**Key Changes:**

- Updated `submitForm` to use per-request body fields
- Added `selectedChatModel` prop for complete configuration
- Updated dependency arrays to include new props

**Implementation:**

```typescript
sendMessage(
  {
    role: "user",
    parts: [
      ...attachments.map((attachment) => ({
        type: "file" as const,
        url: attachment.url,
        name: attachment.name,
        mediaType: attachment.contentType,
      })),
      {
        type: "text",
        text: input,
      },
    ],
  },
  {
    body: {
      selectedChatModel: selectedChatModel,
      selectedVisibilityType: selectedVisibilityType,
      selectedAgentId: selectedAgentId,
    },
  }
);
```

#### 3. Suggested Actions Component (`components/suggested-actions.tsx`)

**Key Changes:**

- Added `selectedAgentId` and `selectedChatModel` props
- Updated `sendMessage` calls to include custom body fields
- Updated memo comparison to include new props

### Phase 4: Server-Side Implementation

#### API Route (`app/(chat)/api/chat/route.ts`)

**Key Features:**

- Comprehensive logging for debugging
- Dual schema validation (AI SDK v5 + legacy)
- Agent retrieval with user ownership validation
- System prompt application
- Error handling and fallbacks

**Request Processing:**

```typescript
// Extract agent ID from request body
const {
  id,
  selectedChatModel = "chat-model",
  selectedVisibilityType = "private",
  selectedAgentId, // ← This comes from client
} = requestData;

// Fetch and validate agent
if (selectedAgentId) {
  const agent = await getAgentById({ id: selectedAgentId });
  if (agent && agent.userId === session.user.id) {
    agentSystemPrompt = agent.systemPrompt;
    effectiveChatModel = agent.modelId;
  }
}
```

**System Prompt Application:**

```typescript
const finalSystemPrompt = systemPrompt({
  selectedChatModel: effectiveChatModel,
  requestHints,
  agentSystemPrompt, // ← Agent's custom prompt applied here
});
```

### Phase 5: Schema Validation

#### Request Schema (`app/(chat)/api/chat/schema.ts`)

**Key Features:**

- Dual schema support for AI SDK v5 and legacy requests
- Optional `selectedAgentId` field in both schemas
- Proper type validation and error handling

```typescript
const aiSdkRequestSchema = z.object({
  id: z.string().uuid(),
  messages: z.array(
    z.object({
      id: z.string().uuid(),
      role: z.enum(["user", "assistant"]),
      parts: z.array(partSchema),
    })
  ),
  selectedAgentId: z.string().uuid().optional(), // ← Agent ID support
  // ... other fields
});
```

## Key Technical Decisions

### 1. Per-Request vs Transport Configuration

**Decision**: Use per-request body fields instead of transport configuration.

**Rationale**:

- Transport captures values at creation time (stale closure issue)
- Per-request approach captures current state at request time
- AI SDK v5 documentation recommends this approach
- More reliable for dynamic values

### 2. Function-Based Agent ID Retrieval

**Decision**: Use a function that dynamically retrieves the current agent ID.

**Rationale**:

- Always gets the most current value
- Handles fallback logic (first available agent)
- No stale closure issues
- Clean and maintainable

### 3. Comprehensive Logging

**Decision**: Add extensive logging for debugging.

**Rationale**:

- Complex request flow with multiple components
- Need to verify agent ID is being passed correctly
- Helps identify issues in production
- Essential for troubleshooting

### 4. Dual Schema Support

**Decision**: Support both AI SDK v5 and legacy request formats.

**Rationale**:

- Backward compatibility
- Handles different client implementations
- Robust error handling
- Future-proof approach

## Security Considerations

### 1. User Ownership Validation

```typescript
if (agent.userId !== session.user.id) {
  console.warn("❌ Agent belongs to different user");
  // Continue with default behavior
}
```

### 2. Input Validation

```typescript
// UUID format validation
const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(agentId)) {
  console.error("❌ Invalid agent ID format:", agentId);
  return;
}
```

### 3. Graceful Fallbacks

```typescript
// If agent not found, continue with default behavior
if (!agent) {
  console.warn("❌ Agent not found in database:", selectedAgentId);
  // Continue with default system prompt
}
```

## Performance Considerations

### 1. Database Queries

- Agent lookup is efficient (primary key lookup)
- User ownership validation prevents unauthorized access
- Caching could be added for frequently used agents

### 2. State Management

- Minimal state updates
- Efficient prop passing
- Proper memoization in components

### 3. Request Overhead

- Additional fields in request body are minimal
- No additional network requests
- Efficient JSON serialization

## Testing Strategy

### 1. Unit Testing

- Agent ID validation
- Database query functions
- Schema validation

### 2. Integration Testing

- End-to-end agent switching
- Request/response flow
- Error handling scenarios

### 3. Manual Testing

- Agent selection in UI
- Message sending with different agents
- Conversation continuity
- Error scenarios

## Debugging and Monitoring

### 1. Comprehensive Logging

```typescript
console.log("🔍 Raw request body:", JSON.stringify(json, null, 2));
console.log("🔍 selectedAgentId value:", json.selectedAgentId);
console.log("🔍 selectedAgentId type:", typeof json.selectedAgentId);
```

### 2. Request Flow Tracking

```typescript
console.log("🤖 Attempting to load agent:", selectedAgentId);
console.log("✅ Agent configuration applied:", {
  agentName: agent.name,
  effectiveChatModel,
  systemPromptPreview: `${agentSystemPrompt.slice(0, 100)}...`,
});
```

### 3. Error Handling

```typescript
console.error("❌ Agent retrieval error:", {
  selectedAgentId,
  error: error instanceof Error ? error.message : String(error),
  stack: error instanceof Error ? error.stack : undefined,
});
```

## Future Enhancements

### 1. Agent Caching

- Cache frequently used agents
- Reduce database queries
- Improve performance

### 2. Agent Templates

- Pre-defined agent templates
- Easy agent creation
- Consistent agent types

### 3. Agent Analytics

- Track agent usage
- Performance metrics
- User preferences

### 4. Advanced Agent Features

- Agent-specific tools
- Custom model configurations
- Agent chaining

## Lessons Learned

### 1. AI SDK v5 Patterns

- Per-request body fields are the correct approach
- Transport configuration has limitations for dynamic values
- Documentation is essential for proper implementation

### 2. State Management

- Function-based state retrieval is more reliable than refs
- Proper prop drilling is necessary for complex components
- Memoization is important for performance

### 3. Error Handling

- Graceful fallbacks are essential
- Comprehensive logging helps debugging
- User-friendly error messages

### 4. Security

- Always validate user ownership
- Input validation prevents injection attacks
- Proper error handling prevents information leakage

## Conclusion

The agent ID implementation successfully enables dynamic agent switching in the Horde AI chat system. The key to success was using AI SDK v5's per-request body fields approach, which ensures that the current agent ID is always captured at request time.

The implementation is robust, secure, and performant, with comprehensive error handling and debugging capabilities. The modular design allows for easy extension and maintenance.

**Key Success Factors:**

1. Understanding AI SDK v5's intended patterns
2. Comprehensive testing and debugging
3. Proper security validation
4. Graceful error handling
5. Clean component architecture

The system now supports seamless agent switching while maintaining conversation context and providing a smooth user experience.
