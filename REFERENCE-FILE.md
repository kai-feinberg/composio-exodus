# AI Chatbot Implementation Patterns Reference

> **Comprehensive reference for all patterns, architectures, and implementations in this AI chatbot built with Vercel AI SDK v5**

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Text Generation Patterns](#text-generation-patterns)
3. [Streaming Implementation](#streaming-implementation)
4. [Tool Call System](#tool-call-system)
5. [Generative UI Patterns](#generative-ui-patterns)
6. [Artifacts Framework](#artifacts-framework)
7. [Thread Management](#thread-management)
8. [Authentication & Security](#authentication--security)
9. [Database & Persistence](#database--persistence)
10. [Performance Optimizations](#performance-optimizations)
11. [Key Implementation Files](#key-implementation-files)

---

## Architecture Overview

### Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19 RC, TypeScript
- **AI SDK**: Vercel AI SDK v5 (beta)
- **Styling**: Tailwind CSS, shadcn/ui, Framer Motion
- **Database**: PostgreSQL (Neon), Drizzle ORM
- **Auth**: NextAuth.js v5 (beta)
- **Real-time**: Server-Sent Events (SSE), Redis (optional)
- **File Storage**: Vercel Blob
- **Code Execution**: Pyodide (client-side Python)

### Project Structure

```
app/
├── (auth)/          # Authentication routes and logic
├── (chat)/          # Main chat application
│   ├── api/         # API routes (chat, history, documents)
│   ├── chat/[id]/   # Dynamic chat pages
│   └── layout.tsx   # Chat-specific layout
artifacts/           # Artifact type implementations
├── code/           # Code execution artifacts
├── text/           # Text editing artifacts
├── image/          # Image generation artifacts
└── sheet/          # Spreadsheet artifacts
components/         # Reusable UI components
hooks/             # Custom React hooks
lib/
├── ai/            # AI SDK configuration, tools, prompts
├── db/            # Database schema and queries
└── artifacts/     # Server-side artifact handling
```

---

## Text Generation Patterns

### AI Model Configuration

**File**: `lib/ai/models.ts`

```typescript
interface ChatModel {
  id: string;
  name: string;
  description: string;
}

const CHAT_MODELS: ChatModel[] = [
  {
    id: "chat-model",
    name: "Default Chat Model",
    description: "For general conversation and assistance",
  },
  {
    id: "chat-model-reasoning",
    name: "Reasoning Model",
    description: "For complex reasoning and analysis",
  },
];
```

### System Prompts

**File**: `lib/ai/prompts.ts`

Key patterns:

- **Context-aware prompts** based on model selection
- **Geographic context** injection via RequestHints
- **Tool-specific prompts** for artifacts and document operations
- **Reasoning vs standard** prompt variations

### Provider Configuration

**File**: `lib/ai/providers.ts`

```typescript
const myProvider = createProvider({
  id: "provider",
  languageModel(id) {
    return xai(id); // Uses xAI as default provider
  },
});
```

---

## Streaming Implementation

### Server-Side Streaming

**File**: `app/(chat)/api/chat/route.ts`

```typescript
const stream = createUIMessageStream({
  execute: ({ writer: dataStream }) => {
    const result = streamText({
      model: myProvider.languageModel(selectedChatModel),
      system: systemPrompt({ selectedChatModel, requestHints }),
      messages: convertToModelMessages(uiMessages),
      experimental_transform: smoothStream({ chunking: "word" }),
      tools: { getWeather, createDocument, updateDocument, requestSuggestions },
    });
  },
});

return stream.response().pipeThrough(JsonToSseTransformStream());
```

**Key Features**:

- **Word-level chunking** for smooth text streaming
- **Resumable streams** with Redis backing (optional)
- **Tool integration** during streaming
- **SSE transformation** for client communication

### Client-Side Stream Handling

**File**: `components/data-stream-handler.tsx`

```typescript
export function DataStreamHandler({
  stream,
}: {
  stream: DataStreamHandlerProps["stream"];
}) {
  const processedIndicesRef = useRef<number>(0);
  const { artifact, setArtifact } = useArtifact();

  useEffect(() => {
    if (!stream || !artifact) return;

    const newDeltas = stream.slice(processedIndicesRef.current);

    for (const delta of newDeltas) {
      // Process different delta types: data-id, data-title, data-kind, etc.
      artifactDefinitions[artifact.kind]?.onStreamPart?.({
        streamPart: delta,
        setArtifact,
        setMetadata: () => {},
      });
    }

    processedIndicesRef.current = stream.length;
  }, [stream, artifact, setArtifact]);
}
```

**Patterns**:

- **Incremental processing** of stream deltas
- **Type-specific handlers** for different content types
- **State synchronization** between streaming and UI
- **Progressive disclosure** based on content thresholds

### Main Chat Integration

**File**: `components/chat.tsx`

```typescript
const { messages, sendMessage, status, stop, regenerate, resumeStream } =
  useChat<ChatMessage>({
    id,
    experimental_throttle: 100,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({ type: "error", description: error.message });
      }
    },
  });
```

---

## Tool Call System

### Tool Architecture

All tools follow the AI SDK's `tool()` pattern with consistent structure:

```typescript
export const createDocument = tool({
  description: "Create a document",
  parameters: z.object({
    title: z.string().describe("Document title"),
    kind: z.enum(["text", "code"]).describe("Document type"),
  }),
  execute: async ({ title, kind }, { dataStream, user }) => {
    // Write streaming data events
    dataStream.write({
      type: "data-kind",
      data: kind,
      transient: true,
    });

    // Generate content using AI models
    const content = await generateContent(title, kind);

    return { documentId: id, title, content };
  },
});
```

### Available Tools

**Files**: `lib/ai/tools/`

1. **`create-document.ts`**: Creates new artifacts with AI generation
2. **`update-document.ts`**: Modifies existing artifacts
3. **`get-weather.ts`**: Fetches weather data for locations
4. **`request-suggestions.ts`**: Generates contextual suggestions

### Tool UI Patterns

**Files**: `components/document.tsx`, `components/weather.tsx`

```typescript
// Weather tool display
export function Weather({ weatherAtLocation }: WeatherProps) {
  if (!weatherAtLocation) {
    return <WeatherSkeleton />;
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <WeatherIcon condition={current.condition} />
        <span>{current.temperature}°</span>
      </div>
      <HourlyForecast forecast={hourly} />
    </div>
  );
}
```

**Tool Display Patterns**:

- **Loading states** with skeleton components
- **Progressive data revelation** as tools execute
- **Interactive results** that can trigger follow-up actions
- **Error handling** with user-friendly messages

---

## Generative UI Patterns

### Suggested Actions

**File**: `components/suggested-actions.tsx`

```typescript
const suggestions = [
  {
    title: "Create a Python script",
    description: 'that prints "Hello, World!"',
    message: 'Create a Python script that prints "Hello, World!"',
  },
  {
    title: "Analyze data",
    description: "from a CSV file",
    message: "Help me analyze data from a CSV file",
  },
];

return (
  <motion.div className="grid sm:grid-cols-2 gap-2 w-full">
    {suggestions.map((suggestion, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 * index }}
      >
        <Suggestion suggestion={suggestion} />
      </motion.div>
    ))}
  </motion.div>
);
```

### Dynamic Suggestions

**File**: `components/suggestion.tsx`

Generated during artifact creation with contextual awareness:

- **Artifact-specific suggestions** (code improvements, text edits)
- **Real-time generation** during streaming
- **Interactive application** via button clicks
- **Context preservation** for relevant suggestions

---

## Artifacts Framework

### Core Architecture

**File**: `components/artifact.tsx`

```typescript
interface Artifact<T = unknown, M = unknown> {
  content: React.ComponentType<ArtifactContentProps<T>>;
  actions: React.ComponentType<ArtifactActionsProps<T>>;
  toolbar?: React.ComponentType<ArtifactToolbarProps<T>>;
  onStreamPart?: (props: StreamPartHandlerProps<T, M>) => void;
  initialize?: (props: ArtifactInitializeProps<T>) => T;
}

const artifactDefinitions: Record<string, Artifact> = {
  text: TextArtifact,
  code: CodeArtifact,
  image: ImageArtifact,
  sheet: SheetArtifact,
};
```

### Artifact Types

#### Text Artifacts

**Files**: `artifacts/text/client.tsx`, `artifacts/text/server.ts`

- **Markdown editing** with ProseMirror
- **AI-powered suggestions** for content improvement
- **Version control** with diff viewing
- **Real-time collaboration** with auto-save

#### Code Artifacts

**Files**: `artifacts/code/client.tsx`, `artifacts/code/server.ts`

- **Python execution** via Pyodide (client-side)
- **Matplotlib integration** with automatic plot capture
- **Console output** handling (text + images)
- **Package management** with loading feedback

#### Image Artifacts

**Files**: `artifacts/image/client.tsx`, `artifacts/image/server.ts`

- **AI image generation** using provider models
- **Base64 handling** and clipboard integration
- **Single-shot generation** (no streaming)
- **Version management** for different iterations

#### Sheet Artifacts

**Files**: `artifacts/sheet/client.tsx`, `artifacts/sheet/server.ts`

- **CSV data manipulation** with PapaParse
- **Grid interface** for spreadsheet editing
- **Data cleaning** and formatting tools
- **Export capabilities** to various formats

### Artifact Lifecycle

1. **Creation**: Tool calls `createDocument` with type and parameters
2. **Streaming**: Content streams via `data-*Delta` events
3. **Display**: Progressive revelation based on content thresholds
4. **Persistence**: Auto-save with debounced writes (2s delay)
5. **Versioning**: Each save creates new version with diff capability

---

## Thread Management

### Database Schema

**File**: `lib/db/schema.ts`

```typescript
// Core entities and relationships
export const user = pgTable("User", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  email: varchar("email", { length: 64 }).notNull(),
  password: varchar("password", { length: 64 }),
  type: varchar("type", { length: 6 }).notNull().$type<"guest" | "user">(),
});

export const chat = pgTable("Chat", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  createdAt: timestamp("createdAt").notNull(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  visibility: varchar("visibility", { length: 7 })
    .notNull()
    .$type<"public" | "private">(),
});

export const message = pgTable("Message", {
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 9 }).notNull().$type<"user" | "assistant">(),
  parts: json("parts").$type<MessagePart[]>().notNull(),
  attachments: json("attachments").$type<Attachment[]>(),
  createdAt: timestamp("createdAt").notNull(),
});
```

### Query Patterns

**File**: `lib/db/queries.ts`

```typescript
// Cursor-based pagination for chat history
export async function getChatsByUserId({
  id,
  limit = 50,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit?: number;
  startingAfter?: Date;
  endingBefore?: Date;
}) {
  let query = db
    .select()
    .from(chat)
    .where(eq(chat.userId, id))
    .orderBy(desc(chat.createdAt))
    .limit(limit + 1);

  if (startingAfter) {
    query = query.where(lt(chat.createdAt, startingAfter));
  } else if (endingBefore) {
    query = query.where(gt(chat.createdAt, endingBefore));
  }

  const chats = await query;
  const hasMore = chats.length > limit;

  return {
    chats: hasMore ? chats.slice(0, -1) : chats,
    hasMore,
  };
}
```

### Chat History UI

**File**: `components/sidebar-history.tsx`

```typescript
// Infinite scroll with SWR
const {
  data: paginatedChatHistories,
  setSize,
  isValidating,
  isLoading,
  mutate,
} = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
  revalidateFirstPage: false,
  revalidateAll: false,
});

// Date-based grouping
const groupedChats = groupChatsByDate(allChats);
```

**Features**:

- **Infinite scroll** with cursor-based pagination
- **Date grouping** (Today, Yesterday, Last 7 days, etc.)
- **Optimistic updates** for immediate feedback
- **Loading skeletons** with dynamic widths

---

## Authentication & Security

### Multi-Provider Auth

**File**: `app/(auth)/auth.ts`

```typescript
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: [
    credentials({
      credentials: { email: {}, password: {} },
      authorize: async ({ email, password }) => {
        const user = await getUserByEmail(email);

        if (!user) {
          // Prevent timing attacks
          await compare(password, "dummy_hash");
          return null;
        }

        if (await compare(password, user.password!)) {
          return { id: user.id, email: user.email, type: user.type };
        }

        return null;
      },
    }),
  ],
});
```

### Guest User System

**File**: `middleware.ts`

```typescript
export async function middleware(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    // Create guest user automatically
    const guestUser = await createGuestUser();
    // Set session cookie
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
```

### Privacy Controls

**File**: `components/visibility-selector.tsx`

```typescript
export function VisibilitySelector({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: VisibilityProps) {
  const [optimisticVisibility, setOptimisticVisibility] = useState(
    selectedVisibilityType
  );

  const handleVisibilityChange = async (visibility: "public" | "private") => {
    setOptimisticVisibility(visibility); // Optimistic UI
    await updateChatVisibility({ chatId, visibility });
    mutate(getChatHistoryPaginationKey); // Invalidate cache
  };
}
```

---

## Database & Persistence

### Connection Management

**File**: `lib/db/utils.ts`

Uses Drizzle ORM with PostgreSQL:

- **Connection pooling** for performance
- **Migration management** with versioned schemas
- **Type safety** with generated types

### Caching Strategy

**Multiple levels of caching**:

1. **SWR Client Cache**: Automatic stale-while-revalidate
2. **NextAuth Session Cache**: JWT with refresh tokens
3. **Cookie Persistence**: User preferences (model, sidebar state)
4. **Database Indexes**: Optimized queries on frequently accessed fields

### Data Migration

**File**: `lib/db/migrate.ts`

```typescript
async function runMigrations() {
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
}
```

Supports versioned schema changes with rollback capability.

---

## Performance Optimizations

### Component Optimization

- **React.memo** with custom comparison functions
- **Memoized callbacks** to prevent unnecessary re-renders
- **Lazy loading** for heavy components (CodeMirror, artifact editors)

### Network Optimization

- **SWR caching** with stale-while-revalidate pattern
- **Optimistic updates** for immediate UI feedback
- **Debounced API calls** (2s delay for auto-save)
- **Cursor-based pagination** instead of offset-based

### Streaming Optimization

- **Word-level chunking** for smooth text appearance
- **Throttled updates** (100ms) to prevent UI thrashing
- **Progressive disclosure** based on content thresholds
- **Memory management** with proper cleanup of streams

### Bundle Optimization

- **Dynamic imports** for large dependencies (Pyodide)
- **Code splitting** by route and feature
- **Tree shaking** with modern build tools

---

## Key Implementation Files

### Core Chat Files

- `app/(chat)/api/chat/route.ts` - Main chat API with streaming
- `app/(chat)/api/chat/[id]/stream/route.ts` - Stream resumption
- `components/chat.tsx` - Main chat orchestration
- `components/message.tsx` - Individual message rendering
- `components/messages.tsx` - Message container with scroll management

### Streaming Infrastructure

- `components/data-stream-handler.tsx` - Stream event processing
- `components/data-stream-provider.tsx` - Stream state context
- `hooks/use-messages.tsx` - Message state management

### AI Integration

- `lib/ai/models.ts` - Model configuration
- `lib/ai/providers.ts` - AI provider setup
- `lib/ai/prompts.ts` - System prompt management
- `lib/ai/tools/` - Tool implementations

### Artifact System

- `components/artifact.tsx` - Artifact framework
- `artifacts/*/client.tsx` - Client-side artifact UIs
- `artifacts/*/server.ts` - Server-side artifact generation
- `hooks/use-artifact.ts` - Artifact state management

### Database Layer

- `lib/db/schema.ts` - Database schema definitions
- `lib/db/queries.ts` - Typed query functions
- `lib/db/migrate.ts` - Migration management

### Authentication

- `app/(auth)/auth.ts` - NextAuth configuration
- `middleware.ts` - Route protection and guest user creation
- `app/(auth)/actions.ts` - Auth server actions

---

## Development Patterns Summary

1. **Type Safety**: Full TypeScript coverage with Zod validation
2. **Real-time Updates**: SSE streaming with progressive disclosure
3. **Error Handling**: Structured error types with user-friendly messages
4. **State Management**: SWR for server state, React Context for UI state
5. **Performance**: Memoization, lazy loading, optimistic updates
6. **Security**: Multi-layer authentication, input validation, access control
7. **Extensibility**: Plugin architecture for artifacts and tools
8. **User Experience**: Smooth animations, loading states, responsive design

This reference provides the complete architectural foundation for understanding and extending the AI chatbot implementation.
