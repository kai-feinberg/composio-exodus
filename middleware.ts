import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher([
  '/',
  '/chat(.*)',
  '/api/chat(.*)',
  '/api/history(.*)',
  '/api/document(.*)',
  '/api/vote(.*)',
  '/api/suggestions(.*)',
  '/api/files(.*)',
  '/api/agents(.*)',
  '/agents(.*)',
  '/admin(.*)',
  '/api/admin(.*)',
]);

const isAdminRoute = createRouteMatcher([
  '/agents',
  '/api/agents',
  '/api/agents/[id]',
  '/api/agents/initialize',
  '/admin(.*)',
  '/api/admin(.*)',
]);

const isOrgRequiredRoute = createRouteMatcher([
  '/',
  '/chat(.*)',
  '/api/chat(.*)',
  '/api/history(.*)', 
  '/api/document(.*)',
  '/api/vote(.*)',
  '/api/suggestions(.*)',
  '/api/files(.*)',
  '/api/agents(.*)',
  '/admin(.*)',
  '/api/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Protect all routes that require authentication
  if (isProtectedRoute(req)) {
    await auth.protect();
  }

  // Additional checks for authenticated routes
  if (isProtectedRoute(req)) {
    const { userId, orgId, has } = await auth();
    
    // If user is authenticated, check additional requirements
    if (userId) {
      // Admin route protection
      if (isAdminRoute(req)) {
        const isAdmin = has({ role: 'org:admin' });
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/', req.url));
        }
      }

      // Organization membership requirement for most routes
      if (isOrgRequiredRoute(req) && !orgId) {
        // Allow access to organization selection/creation flow
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
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
