import { auth as clerkAuth } from '@clerk/nextjs/server';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { user } from './db/schema';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export type UserType = 'regular';
export type OrgRole = 'org:admin' | 'org:member';

export interface User {
  id: string;
  email?: string | null;
  type: UserType;
  organizationId?: string | null;
  organizationRole?: OrgRole | null;
}

export interface Session {
  user: User;
}

export async function auth(): Promise<Session | null> {
  const { userId, orgId, orgRole } = await clerkAuth();

  if (!userId) {
    return null;
  }

  return {
    user: {
      id: userId,
      email: null, // We'll get this from Clerk user object when needed
      type: 'regular' as UserType,
      organizationId: orgId,
      organizationRole: orgRole as OrgRole | null,
    },
  };
}

// Role checking utilities using Clerk's auth().has()
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

export async function getActiveOrganization(): Promise<string | null> {
  const { orgId } = await clerkAuth();
  return orgId ?? null;
}

// User synchronization with database
export async function ensureUserExists(clerkUserId: string, organizationId?: string | null): Promise<void> {
  try {
    const existingUser = await db.select().from(user).where(eq(user.id, clerkUserId));
    
    if (existingUser.length === 0) {
      await db.insert(user).values({
        id: clerkUserId,
        email: `${clerkUserId}@clerk.local`, // Placeholder email, will be updated when needed
        organizationId,
      });
      console.log('✅ Created user record for Clerk user:', clerkUserId);
    }
  } catch (error) {
    console.error('❌ Failed to ensure user exists:', error);
    throw error;
  }
}
