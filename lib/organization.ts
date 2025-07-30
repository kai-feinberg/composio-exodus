import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { OrgRole } from './auth';

/**
 * Server-side role verification utility
 * Checks if the current user has the specified organization role
 */
export async function checkOrgRole(role: OrgRole): Promise<boolean> {
  try {
    const { has } = await auth();
    return has({ role });
  } catch (error) {
    console.error('Error checking organization role:', error);
    return false;
  }
}

/**
 * Admin-only access helper
 * Throws error if user is not an org admin
 */
export async function requireOrgAdmin(): Promise<void> {
  const isAdmin = await checkOrgRole('org:admin');
  if (!isAdmin) {
    throw new Error('Unauthorized: Organization admin access required');
  }
}

/**
 * Get the current active organization context
 * Returns organization ID or null if user is not in an organization
 */
export async function getActiveOrganization(): Promise<string | null> {
  try {
    const { orgId } = await auth();
    return orgId ?? null;
  } catch (error) {
    console.error('Error getting active organization:', error);
    return null;
  }
}

/**
 * Check if user has any organization membership
 * Used for handling users without organizations
 */
export async function hasOrganizationMembership(): Promise<boolean> {
  const orgId = await getActiveOrganization();
  return orgId !== null;
}

/**
 * Get organization role for the current user
 * Returns the user's role in the active organization
 */
export async function getCurrentOrgRole(): Promise<OrgRole | null> {
  try {
    const { orgRole } = await auth();
    return orgRole as OrgRole | null;
  } catch (error) {
    console.error('Error getting current organization role:', error);
    return null;
  }
}

/**
 * Middleware helper for redirecting non-admin users
 * Returns redirect response for unauthorized access
 */
export function createAdminRedirect(requestUrl: string): NextResponse {
  return NextResponse.redirect(new URL('/', requestUrl));
}

/**
 * Validate organization context for data access
 * Ensures user has organization membership before accessing org-scoped data
 */
export async function validateOrgContext(): Promise<{
  success: boolean;
  orgId: string | null;
  error?: string;
}> {
  const orgId = await getActiveOrganization();
  
  if (!orgId) {
    return {
      success: false,
      orgId: null,
      error: 'No active organization found. Please join or create an organization.',
    };
  }

  return {
    success: true,
    orgId,
  };
}

/**
 * Server action wrapper that requires admin access
 * Use this to wrap server actions that need admin permissions
 */
export async function withAdminAccess<T extends any[], R>(
  action: (...args: T) => Promise<R>
): Promise<(...args: T) => Promise<R>> {
  return async (...args: T): Promise<R> => {
    await requireOrgAdmin();
    return action(...args);
  };
}

/**
 * Generate organization-scoped database filter
 * Returns filter object for org-scoped queries
 */
export async function getOrgScopeFilter(): Promise<{
  organizationId?: string;
  userId?: string;
} | null> {
  const { userId, orgId } = await auth();
  
  if (!userId) {
    return null;
  }

  // If user is in an organization, scope by orgId
  // Otherwise, scope by userId for backward compatibility
  return orgId ? { organizationId: orgId } : { userId };
}