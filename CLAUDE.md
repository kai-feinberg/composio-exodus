# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15 AI chatbot application (Chat SDK) built with TypeScript, using the AI SDK for language model integration. The app features real-time chat, artifacts (code/image/sheet editing), document collaboration, and authentication.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server with Turbo
pnpm dev

# Build production (includes database migration)
pnpm build

# Linting and formatting
pnpm lint           # ESLint + Biome lint with auto-fix
pnpm lint:fix       # ESLint fix + Biome lint with auto-fix
pnpm format         # Biome format

# Database operations
pnpm db:generate    # Generate Drizzle schema
pnpm db:migrate     # Run database migrations
pnpm db:studio      # Open Drizzle Studio
pnpm db:push        # Push schema to database
pnpm db:pull        # Pull schema from database

# Testing
pnpm test           # Run Playwright e2e tests
```

## Architecture

## Process

- ALWAYS look at reference implementations from within the codebase when you get stuck or have to plan out a feature. There is a comprehensive file outlining the codebase in @REFERENCE-FILE.md. You can also use the web to search this link https://deepwiki.com/vercel/ai-chatbot/1.1-architecture-overview which will provide more information.

### Core Structure

- **App Router**: Next.js 15 with React Server Components and Server Actions
- **Database**: PostgreSQL with Drizzle ORM, schema versioning (Message_v2, Vote_v2)
- **Authentication**: NextAuth.js (Auth.js) with email/password
- **AI Provider**: xAI Grok models (configurable via `lib/ai/providers.ts`)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Code Quality**: Biome for linting/formatting, ESLint for additional checks

### Key Directories

- `app/(auth)/` - Authentication pages and API routes
- `app/(chat)/` - Main chat interface and API endpoints
- `artifacts/` - Artifact system (code, image, sheet, text editors)
- `components/` - React components including shadcn/ui
- `lib/ai/` - AI provider configuration and model definitions
- `lib/db/` - Database schema, queries, and migrations
- `lib/editor/` - Rich text editor configurations
- `hooks/` - Custom React hooks
- `tests/` - Playwright e2e and route tests

### AI Models Configuration

The app uses xAI Grok models by default:

- `chat-model`: grok-2-vision-1212 (primary chat)
- `chat-model-reasoning`: grok-3-mini-beta with reasoning middleware
- `title-model`: grok-2-1212 (chat titles)
- `artifact-model`: grok-2-1212 (artifact generation)
- Image model: grok-2-image

Models are configured in `lib/ai/providers.ts` with test mocks available.

### Database Schema

Key tables include:

- `User` - User accounts with email/password
- `Chat` - Chat sessions with visibility settings
- `Message_v2` - Chat messages with parts and attachments
- `Document` - Artifacts (text, code, image, sheet)
- `Suggestion` - Document editing suggestions
- `Vote_v2` - Message voting system
- `Stream` - Real-time streaming sessions

Note: Deprecated tables (Message, Vote) exist for migration compatibility.

### Artifacts System

Supports four artifact types:

- **Code**: CodeMirror-based editor with syntax highlighting
- **Text**: ProseMirror-based rich text editor
- **Image**: Image editing and generation
- **Sheet**: Data grid for spreadsheet functionality

## Environment Setup

Create `.env.local` with required variables (see `.env.example` in original repo):

- `POSTGRES_URL` - Database connection
- `AUTH_SECRET` - NextAuth secret
- AI provider API keys

## Testing

- **E2E Tests**: Playwright tests in `tests/e2e/`
- **Route Tests**: API endpoint tests in `tests/routes/`
- **Test Environment**: Uses mock AI models when `PLAYWRIGHT=True`

Run tests with `pnpm test` - this sets the PLAYWRIGHT environment variable and runs Playwright tests.

## Code Style

- **Biome**: Primary linter/formatter with extensive configuration
- **TypeScript**: Strict mode enabled
- **React**: Server Components where possible, Client Components when needed
- **Tailwind**: Component styling with shadcn/ui patterns
- **Server Actions**: Used for form submissions and data mutations

## Important Notes

- Database migrations run automatically during build
- The app uses partial prerendering (PPR) for performance
- Authentication is required for most features
- File uploads use Vercel Blob storage
- Real-time features use streaming responses
