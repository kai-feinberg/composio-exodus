# Auth.js to Clerk Migration Guide

This document provides a comprehensive guide for migrating from Auth.js (NextAuth.js) to Clerk authentication in the Horde AI chat application.

## Overview

The migration from Auth.js to Clerk involved several major changes:
- **Authentication Provider**: Switched from NextAuth.js to Clerk
- **User ID Format**: Changed from UUID to string-based Clerk user IDs
- **Database Schema**: Updated user table and all foreign key references
- **Middleware**: Replaced NextAuth middleware with Clerk middleware
- **Organization Support**: Added Clerk organizations with RBAC
- **API Route Protection**: Updated authentication checks across all routes

## Package Dependencies

### Added Dependencies
```json
{
  "@clerk/nextjs": "^6.27.1"
}
```

### Removed Dependencies
- `next-auth`
- `@auth/drizzle-adapter`
- Any OAuth provider packages that were used with NextAuth

## Database Schema Changes

### 1. User Table Migration

**Before (Auth.js):**
```sql
CREATE TABLE "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);
```

**After (Clerk):**
```sql
CREATE TABLE "User" (
  "id" varchar(255) PRIMARY KEY NOT NULL, -- Clerk user IDs are strings
  "email" varchar(64) NOT NULL,
  "password" varchar(64), -- Optional, Clerk handles auth
  "organizationId" varchar(255) -- Clerk organization ID
);
```

### 2. Related Tables Update

All tables with foreign key references to `User.id` needed updates:

**Chat Table:**
```sql
-- Added organization support
ALTER TABLE "Chat" ADD COLUMN "organizationId" varchar(255);
-- userId now references varchar instead of uuid
```

**Document Table:**
```sql
-- Added organization support
ALTER TABLE "Document" ADD COLUMN "organizationId" varchar(255);
-- userId now references varchar instead of uuid
```

**Agent Table:**
```sql
-- Added organization support and global agents
ALTER TABLE "Agent" ADD COLUMN "organizationId" varchar(255);
ALTER TABLE "Agent" ADD COLUMN "isGlobal" boolean NOT NULL DEFAULT false;
-- userId now references varchar instead of uuid
```

### 3. Migration SQL

The complete migration script (`0002_migrate_to_clerk_user_ids.sql`):

```sql
-- Migration to change user IDs from UUID to VARCHAR for Clerk compatibility

-- Create new tables with updated schema
CREATE TABLE "User_new" (
  "id" varchar(255) PRIMARY KEY NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);

CREATE TABLE "Chat_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  "visibility" varchar DEFAULT 'private' NOT NULL
);

CREATE TABLE "Document_new" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "text" varchar DEFAULT 'text' NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  PRIMARY KEY ("id", "createdAt")
);

CREATE TABLE "Agent_new" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "systemPrompt" text NOT NULL,
  "modelId" varchar(50) DEFAULT 'chat-model' NOT NULL,
  "userId" varchar(255) NOT NULL REFERENCES "User_new"("id"),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

-- Drop old tables and rename new ones
DROP TABLE IF EXISTS "Agent" CASCADE;
DROP TABLE IF EXISTS "Document" CASCADE;
DROP TABLE IF EXISTS "Chat" CASCADE;
DROP TABLE IF EXISTS "User" CASCADE;

ALTER TABLE "User_new" RENAME TO "User";
ALTER TABLE "Chat_new" RENAME TO "Chat";
ALTER TABLE "Document_new" RENAME TO "Document";
ALTER TABLE "Agent_new" RENAME TO "Agent";
```

## Authentication Library Changes

### 1. Auth Library (`lib/auth.ts`)

**Before (Auth.js):**
```typescript
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
// Complex NextAuth configuration...

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    // OAuth providers
  ],
  // Session configuration
});
```

**After (Clerk):**
```typescript
import { auth as clerkAuth } from '@clerk/nextjs/server';
import { ensureUserExists } from './db/queries';

export interface User {
  id: string;
  email?: string | null;
  type: UserType;
  organizationId?: string | null;
  organizationRole?: OrgRole | null;
}

export async function auth(): Promise<Session | null> {
  const { userId, orgId, orgRole } = await clerkAuth();

  if (!userId) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: null, // Retrieved from Clerk when needed
      type: 'regular' as UserType,
      organizationId: orgId,
      organizationRole: orgRole as OrgRole | null,
    },
  };
}

// Role checking utilities
export async function checkOrgRole(role: OrgRole): Promise<boolean> {
  const { has } = await clerkAuth();
  return has({ role });
}

export async function requireOrgAdmin(): Promise<void> {
  const isAdmin = await checkOrgRole('org:admin');
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

// User synchronization with database
export async function ensureUserExists(clerkUserId: string, organizationId?: string | null): Promise<void> {
  try {
    const existingUser = await db.select().from(user).where(eq(user.id, clerkUserId));
    
    if (existingUser.length === 0) {
      await db.insert(user).values({
        id: clerkUserId,
        email: `${clerkUserId}@clerk.local`, // Placeholder
        organizationId,
      });
    }
  } catch (error) {
    console.error('Failed to ensure user exists:', error);
    throw error;
  }
}
```

### 2. Middleware Changes (`middleware.ts`)

**Before (Auth.js):**
```typescript
import { auth } from '@/lib/auth';

export default auth((req) => {
  // Simple auth checks
});
```

**After (Clerk):**
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/', '/chat(.*)', '/api/chat(.*)', '/api/history(.*)',
  '/api/document(.*)', '/api/vote(.*)', '/api/suggestions(.*)',
  '/api/files(.*)', '/api/agents(.*)', '/agents(.*)',
  '/admin(.*)', '/api/admin(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/agents', '/api/agents', '/api/agents/[id]',
  '/api/agents/initialize', '/admin(.*)', '/api/admin(.*)',
]);

const isOrgRequiredRoute = createRouteMatcher([
  '/', '/chat(.*)', '/api/chat(.*)', '/api/history(.*)',
  '/api/document(.*)', '/api/vote(.*)', '/api/suggestions(.*)',
  '/api/files(.*)', '/api/agents(.*)', '/admin(.*)', '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Additional checks for authenticated routes
  if (isProtectedRoute(req)) {
    const { userId, orgId, has } = await auth();
    
    if (userId) {
      // Admin route protection
      if (isAdminRoute(req)) {
        const isAdmin = has({ role: 'org:admin' });
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      }

      // Organization membership requirement
      if (isOrgRequiredRoute(req) && !orgId) {
        const isOrgSelectionFlow = req.nextUrl.pathname === '/organization-required';
        if (!isOrgSelectionFlow) {
          return NextResponse.redirect(new URL('/organization-required', req.url));
        }
      }
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

## UI Component Changes

### 1. Root Layout Provider

**Before (Auth.js):**
```typescript
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
```

**After (Clerk):**
```typescript
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

### 2. Authentication Pages

**Before (Auth.js):**
- Custom login/register forms
- Server actions for authentication
- Manual session management

**After (Clerk):**

**Login Page (`app/(auth)/login/[[...rest]]/page.tsx`):**
```typescript
'use client';

import { SignIn } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <SignIn />
    </div>
  );
}
```

**Register Page (`app/(auth)/register/[[...rest]]/page.tsx`):**
```typescript
'use client';

import { SignUp } from '@clerk/nextjs';

export default function Page() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <SignUp />
    </div>
  );
}
```

### 3. Organization Required Page

New page to handle organization membership requirement:

```typescript
'use client';

import { OrganizationList } from '@clerk/nextjs';

export default function OrganizationRequiredPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Organization Required</CardTitle>
          <CardDescription>
            You need to be part of an organization to use this application.
            Please join an existing organization or create a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationList
            afterCreateOrganizationUrl="/"
            afterSelectOrganizationUrl="/"
            hidePersonal={false}
            skipInvitationScreen={false}
          />
        </CardContent>
      </Card>
    </div>
  );
}
```

## API Route Updates

### 1. Authentication Check Pattern

**Before (Auth.js):**
```typescript
export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Use session.user.id directly
}
```

**After (Clerk):**
```typescript
import { auth, ensureUserExists } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  // Ensure user exists in database before proceeding
  await ensureUserExists(session.user.id, session.user.organizationId);
  
  // Use session.user.id (now a Clerk string ID)
}
```

### 2. Organization-Scoped Queries

**Before (Auth.js):**
```typescript
// Simple user-scoped queries
const chats = await getChatsByUserId(session.user.id);
```

**After (Clerk):**
```typescript
// Organization-scoped queries with fallback to user
const chats = await getChatsByOrganization(
  session.user.organizationId || session.user.id
);
```

## Database Query Updates

### 1. User Creation

**Before (Auth.js):**
```typescript
// Users created automatically by NextAuth adapter
```

**After (Clerk):**
```typescript
// Manual user synchronization required
export async function ensureUserExists(clerkUserId: string, organizationId?: string | null): Promise<void> {
  const existingUser = await db.select().from(user).where(eq(user.id, clerkUserId));
  
  if (existingUser.length === 0) {
    await db.insert(user).values({
      id: clerkUserId,
      email: `${clerkUserId}@clerk.local`,
      organizationId,
    });
  }
}
```

### 2. Organization-Scoped Queries

Added organization filtering to all major queries:

```typescript
// Chat queries
export async function getChatsByOrganization(organizationId: string) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.organizationId, organizationId))
    .orderBy(desc(chat.createdAt));
}

// Agent queries with global support
export async function getAgentsByOrganization(organizationId: string) {
  return await db
    .select()
    .from(agent)
    .where(
      or(
        eq(agent.organizationId, organizationId),
        eq(agent.isGlobal, true)
      )
    )
    .orderBy(desc(agent.createdAt));
}
```

## Environment Variables

### Required Clerk Environment Variables

Add to `.env.local`:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Optional: Clerk URLs (for custom domains)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Removed Environment Variables

```env
# No longer needed
NEXTAUTH_SECRET
NEXTAUTH_URL
AUTH_SECRET
AUTH_URL
```

## RBAC (Role-Based Access Control)

### Organization Roles

Clerk provides built-in organization roles:
- `org:admin` - Full administrative access
- `org:member` - Regular member access

### Role Checking Implementation

```typescript
// Check if user has admin role
export async function requireOrgAdmin(): Promise<void> {
  const isAdmin = await checkOrgRole('org:admin');
  if (!isAdmin) {
    throw new Error('Unauthorized: Admin access required');
  }
}

// Middleware protection for admin routes
if (isAdminRoute(req)) {
  const isAdmin = has({ role: 'org:admin' });
  if (!isAdmin) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}
```

### Agent Management RBAC

Agents now support:
- **Organization-scoped**: Only visible to organization members
- **Global agents**: Visible to all users (admin-created)
- **Role-based creation**: Only admins can create/modify agents

## Challenges and Solutions

### 1. User ID Format Change

**Challenge**: Existing UUID-based user IDs incompatible with Clerk's string IDs.

**Solution**: 
- Complete database migration with new schema
- Updated all foreign key relationships
- Implemented user synchronization function

### 2. Session Management

**Challenge**: Different session structure between Auth.js and Clerk.

**Solution**:
- Created unified auth interface
- Implemented session transformation layer
- Added automatic user database synchronization

### 3. Organization Requirements

**Challenge**: Most routes require organization membership.

**Solution**:
- Added organization-required page
- Implemented middleware redirects
- Created organization-scoped queries

### 4. RBAC Implementation

**Challenge**: Role-based access control across all features.

**Solution**:
- Leveraged Clerk's built-in organization roles
- Added admin-only routes protection
- Implemented global vs organization-scoped resources

### 5. Data Migration

**Challenge**: Migrating existing user data to new schema.

**Solution**:
- Implemented fresh-start migration (dropped old data)
- For production: would need data transformation scripts
- Added user synchronization for new Clerk users

## Testing Considerations

### 1. Authentication Flow Testing

Update tests to use Clerk test utilities:

```typescript
import { createClerkMock } from '@clerk/testing';

// Mock Clerk authentication in tests
const clerkMock = createClerkMock({
  userId: 'test-user-id',
  orgId: 'test-org-id',
  orgRole: 'org:admin',
});
```

### 2. Organization Testing

Test both organization and non-organization scenarios:
- Users with organizations
- Users without organizations (redirect flow)
- Admin vs member permissions

## Migration Checklist

### Pre-Migration
- [ ] Backup existing database
- [ ] Set up Clerk account and application
- [ ] Configure Clerk environment variables
- [ ] Plan data migration strategy

### Code Changes
- [ ] Install `@clerk/nextjs` package
- [ ] Remove NextAuth dependencies
- [ ] Update root layout with ClerkProvider
- [ ] Replace auth library with Clerk integration
- [ ] Update middleware for Clerk
- [ ] Create new auth pages using Clerk components
- [ ] Add organization-required page
- [ ] Update all API routes authentication
- [ ] Implement user synchronization
- [ ] Add RBAC checks

### Database Changes
- [ ] Run user ID migration scripts
- [ ] Add organization columns to all relevant tables
- [ ] Update foreign key relationships
- [ ] Test data integrity

### Testing
- [ ] Test authentication flows
- [ ] Test organization creation/joining
- [ ] Test admin/member role permissions
- [ ] Test API route protection
- [ ] Verify data isolation between organizations

### Deployment
- [ ] Configure Clerk environment variables in production
- [ ] Run database migrations
- [ ] Test production authentication
- [ ] Monitor for authentication errors

## Ongoing Maintenance

### User Synchronization

The `ensureUserExists` function should be called in all API routes to maintain database sync:

```typescript
// Always call this in authenticated API routes
await ensureUserExists(session.user.id, session.user.organizationId);
```

### Organization Management

- Monitor organization membership requirements
- Implement organization invitation flows if needed
- Consider organization billing/subscription management

### Role Management

- Regular audit of admin permissions
- Consider adding more granular roles if needed
- Monitor global agent creation and management

This migration provides a more robust authentication system with built-in organization support and RBAC, while maintaining the existing application functionality.