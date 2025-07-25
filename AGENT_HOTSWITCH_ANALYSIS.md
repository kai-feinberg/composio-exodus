# Agent Hot-Switching Implementation Analysis

## Problem Statement

The Horde AI chat application has an agent selector UI that allows users to switch between different AI agents (with different system prompts and models) mid-conversation. However, the agent switching was not working - despite the UI showing the correct agent selection, the API continued to receive and use the old agent's configuration.

## Root Cause Analysis

**Core Issue**: The `useChat` hook from `@ai-sdk/react` was not properly updating its internal transport when the `selectedAgentId` changed, resulting in stale closure issues where old agent IDs were captured in the transport's `prepareSendMessagesRequest` function.

**Evidence**:
- ✅ Frontend state correctly updated when agent changed
- ✅ New transport object created via `useMemo` when agent changed  
- ✅ API route correctly handled agent switching logic
- ❌ `useChat` hook continued using old transport instance
- ❌ API received old `selectedAgentId` despite new transport creation

## Approaches Attempted

### Approach 1: Dynamic Transport Recreation with useMemo

**Implementation**:
```typescript
const transport = useMemo(() => {
  return new DefaultChatTransport({
    prepareSendMessagesRequest({ messages, id, body }) {
      return {
        body: { ...body, selectedAgentId }
      };
    },
  });
}, [selectedAgentId]); // Recreate when agent changes
```

**Expected Behavior**: Transport would be recreated when `selectedAgentId` changed, and `useChat` would use the new transport.

**Actual Result**: ❌ Failed - `useChat` hook did not detect the transport change and continued using the old instance.

**Learning**: The `useChat` hook does not properly detect when a new transport object is passed, even when the object reference changes.

### Approach 2: Explicit Closure Value Capture

**Implementation**:
```typescript
const transport = useMemo(() => {
  const currentAgentId = selectedAgentId; // Explicit capture
  return new DefaultChatTransport({
    prepareSendMessagesRequest({ messages, id, body }) {
      return {
        body: { ...body, selectedAgentId: currentAgentId }
      };
    },
  });
}, [selectedAgentId]);
```

**Expected Behavior**: Explicitly capturing the value would prevent stale closures.

**Actual Result**: ❌ Failed - Same issue persisted; `useChat` was not using the new transport.

**Learning**: The closure issue was not the primary problem; the real issue was `useChat` not recognizing transport updates.

### Approach 3: Component Key-Based Re-initialization

**Implementation**:
```typescript
export function Chat(props) {
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage('selectedAgentId', undefined);
  
  return (
    <ChatInstance
      key={selectedAgentId || 'default'} // Force remount when agent changes
      {...props}
      selectedAgentId={selectedAgentId}
    />
  );
}
```

**Expected Behavior**: Force React to completely remount the component containing `useChat` when agent changes.

**Actual Result**: ⚠️ Partially worked but introduced new issues:
- Message history loss on component remount
- Potential prompt cross-contamination
- TypeError with undefined chatId in internal functions

**Learning**: Component remounting can work but creates UX issues and complexity around state preservation.

### Approach 4: Message-Preserving Component Remounting

**Implementation**:
```typescript
export function Chat(props) {
  const [selectedAgentId, setSelectedAgentId] = useLocalStorage('selectedAgentId', undefined);
  const [currentMessages, setCurrentMessages] = useState(props.initialMessages);
  
  return (
    <ChatInstance
      key={selectedAgentId || 'default'}
      currentMessages={currentMessages}
      onMessagesUpdate={setCurrentMessages}
      {...props}
    />
  );
}
```

**Expected Behavior**: Preserve message history across component remounts while ensuring clean agent switching.

**Actual Result**: ⚠️ Complex implementation with state synchronization issues and risk of race conditions.

**Learning**: Trying to preserve state across component remounts adds significant complexity and potential bugs.

### Approach 5: Chat ID Modification

**Implementation**:
```typescript
const {
  messages,
  setMessages,
  sendMessage,
  // ...
} = useChat({
  id: `${id}-${selectedAgentId || 'default'}`, // Force re-init
  messages: currentMessages,
  transport,
});
```

**Expected Behavior**: Force `useChat` to reinitialize by changing its `id` parameter.

**Actual Result**: ❌ Failed - Caused TypeError with undefined chatId in internal functions like `deleteTrailingMessages`.

**Learning**: Modifying the chat ID breaks internal functionality that expects the original chat ID for database operations and message management.

### Approach 6: Transport Uniqueness Enhancement

**Implementation**:
```typescript
const transport = useMemo(() => {
  const transportId = `${selectedAgentId}-${Date.now()}`;
  const transportInstance = new DefaultChatTransport({...});
  (transportInstance as any)._transportId = transportId;
  return transportInstance;
}, [selectedAgentId]);
```

**Expected Behavior**: Make each transport instance truly unique to force `useChat` recognition.

**Actual Result**: ❌ Failed - Same core issue persisted.

**Learning**: The problem is not about transport object uniqueness but about `useChat` hook's internal state management.

## Key Learnings

### 1. useChat Hook Limitations

The `@ai-sdk/react` `useChat` hook has internal state management that doesn't properly detect transport changes:
- Creating new transport objects via `useMemo` doesn't guarantee the hook will use them
- The hook appears to cache or internally manage the transport in a way that prevents hot-swapping
- This is likely a limitation/bug in the AI SDK

### 2. API Route is Already Perfect

The `/api/chat` route already handles agent switching perfectly:
```typescript
if (selectedAgentId) {
  const agent = await getAgentById({ id: selectedAgentId });
  if (agent && agent.userId === session.user.id) {
    agentSystemPrompt = agent.systemPrompt;
    effectiveChatModel = agent.modelId;
  }
}
```

The API fetches the agent, applies its system prompt, and uses its preferred model. **The backend was never the problem.**

### 3. Frontend-Backend State Mismatch

The core issue was a disconnect between:
- **Frontend State**: Correctly updated `selectedAgentId`
- **API Request**: Received old `selectedAgentId` due to stale transport

### 4. Component Remounting Trade-offs

While component remounting via React keys can work, it introduces:
- **UX Issues**: Message history loss, UI flicker
- **Complexity**: State preservation logic, race conditions
- **Bugs**: Chat ID conflicts, internal function errors

### 5. Simplicity vs. Complexity

The most complex solutions (message preservation, state synchronization) were often the most fragile. The root cause was simple - we just couldn't solve it with the current AI SDK limitations.

## Recommended Solutions

### Option 1: Wait for AI SDK Fix
Monitor the `@ai-sdk/react` repository for updates that properly handle transport changes.

### Option 2: Fork and Patch AI SDK
Create a custom version of the `useChat` hook that properly detects transport changes.

### Option 3: Alternative Architecture
Instead of trying to hot-swap within the same chat instance, implement agent switching as:
1. Save current conversation
2. Start new chat session with new agent
3. Optionally import conversation history

### Option 4: Server-Side Agent Resolution
Move agent selection logic entirely to the backend:
1. Store current agent preference in user session/database
2. Frontend doesn't need to send `selectedAgentId`
3. API automatically uses user's current preferred agent

## Technical Debt Assessment

- **Time Invested**: ~8 hours of debugging and implementation attempts
- **Complexity Added**: High (multiple component layers, state management)
- **Reliability**: Low (multiple failure modes identified)
- **Maintainability**: Poor (complex state synchronization)

## Conclusion

Agent hot-switching within a single chat session using the current AI SDK is not reliably achievable due to limitations with the `useChat` hook's transport handling. The most practical solutions involve either waiting for SDK updates or redesigning the architecture to avoid the need for hot-swapping entirely.

The API backend is already perfectly capable of handling agent switching - the limitation is purely on the frontend React hook integration.