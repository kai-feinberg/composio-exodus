import { auth as clerkAuth } from '@clerk/nextjs/server';

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
