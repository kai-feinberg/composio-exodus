# Comprehensive Implementation Plan: Clerk Organizations RBAC with Admin/User Roles

## Overview
Implement role-based access control using Clerk's built-in organization system with `org:admin` and `org:member` roles (where `org:member` serves as the "user" role).

## Phase 1: Clerk Dashboard Configuration (5 minutes)

### 1.1 Enable Organizations
- Navigate to Clerk Dashboard → Organizations
- Enable organization features
- Configure default settings:
  - Maximum members per organization
  - Default role for new members: `org:member`
  - Enable organization switching

### 1.2 Verify Default Roles
- Confirm `org:admin` and `org:member` roles are available
- Review role permissions and system permissions
- Note: `org:admin` has full access, `org:member` has limited access

## Phase 2: Core Authentication Infrastructure (30 minutes)

### 2.1 Update Auth Types (`lib/auth.ts`)
- Extend `UserType` to include organization context
- Add organization-aware user interface
- Create role checking utilities using `auth().has()`

### 2.2 Create Organization Utilities (`lib/organization.ts`)
- `checkOrgRole()`: Server-side role verification
- `requireOrgAdmin()`: Admin-only access helper  
- `getActiveOrganization()`: Current org context
- Error handling for users without organizations

### 2.3 Update Middleware (`middleware.ts`)
- Add organization membership enforcement
- Create admin route protection using `createRouteMatcher(['/admin(.*)'])`
- Redirect non-admin users from admin routes
- Handle users without active organizations

## Phase 3: Database Schema Updates (20 minutes)

### 3.1 Update User-Related Tables
- Add `organizationId` columns where needed
- Update chat, document, and agent queries to be org-scoped
- Migrate existing data to support multi-tenancy

### 3.2 Create Organization-Scoped Queries
- Modify database queries to filter by `orgId || userId`
- Ensure data isolation between organizations
- Update all CRUD operations for multi-tenant support

## Phase 4: UI Components and Protection (45 minutes)

### 4.1 Add Clerk Organization Components
- Install `<OrganizationSwitcher />` in sidebar
- Add organization profile and management
- Create organization selection flow for new users

### 4.2 Implement `<Protect>` Components
- Wrap admin-only UI elements with `<Protect role="org:admin">`
- Add fallback UI for unauthorized access
- Update sidebar navigation for role-based visibility

### 4.3 Update App Sidebar (`components/app-sidebar.tsx`)
- Add `<OrganizationSwitcher />` component
- Show/hide admin links based on `org:admin` role
- Add organization context awareness

## Phase 5: Admin Interface Development (40 minutes)

### 5.1 Create Admin Pages
- `app/(chat)/admin/page.tsx`: Admin dashboard
- `app/(chat)/admin/users/page.tsx`: User management
- `app/(chat)/admin/organizations/page.tsx`: Organization management

### 5.2 Admin Functionality
- List organization members with roles
- Change user roles within organization
- Remove users from organization
- Organization settings and configuration

### 5.3 Server Actions for Role Management
- `setUserRole()`: Update member roles
- `removeUserFromOrg()`: Remove organization members
- Admin authorization checks before mutations

## Phase 6: API Route Protection (25 minutes)

### 6.1 Update API Routes
- Add organization context to all API endpoints
- Implement role-based API access control
- Update chat, document, and agent APIs for org-scoping

### 6.2 Admin-Only API Endpoints
- Create `/api/admin/*` routes with `org:admin` protection
- User management APIs
- Organization analytics and reporting

## Phase 7: Client-Side Integration (30 minutes)

### 7.1 React Hooks and Context
- Use `useAuth()` for client-side role checking
- Implement `useOrganization()` for organization data
- Add organization switching functionality

### 7.2 Conditional Rendering
- Show/hide features based on user roles
- Display admin controls only to `org:admin` users
- Organization-aware navigation and menus

## Phase 8: Testing and Validation (20 minutes)

### 8.1 Role Switching Tests
- Test admin → user role transitions
- Verify route protection works correctly
- Test organization switching scenarios

### 8.2 Data Isolation Verification
- Confirm users only see org-scoped data
- Test admin access to organization management
- Verify non-admin users cannot access admin features

## Phase 9: User Experience Enhancements (15 minutes)

### 9.1 Onboarding Flow
- Guide new users to join/create organizations
- Handle users without organization membership
- Redirect to organization selection when needed

### 9.2 Error Handling
- Graceful handling of permission errors
- Clear messaging for unauthorized access
- Fallback UI for organization-less users

## Technical Implementation Details

### Key Files to Create/Modify:
1. `lib/organization.ts` - Organization utilities
2. `middleware.ts` - Enhanced protection
3. `components/app-sidebar.tsx` - Add OrganizationSwitcher
4. `app/(chat)/admin/page.tsx` - Admin dashboard
5. `app/(chat)/admin/users/page.tsx` - User management
6. `lib/auth.ts` - Extended auth types

### Dependencies Already Available:
- `@clerk/nextjs`: ^6.27.1 ✓
- Next.js 15 App Router ✓
- Existing auth infrastructure ✓

### Integration Points:
- Existing chat system will be org-scoped
- Agent management will respect organization boundaries
- File uploads and documents will be organization-aware

## Clerk Documentation References

### Key Clerk Concepts
- **Built-in Roles**: `org:admin` (full access) and `org:member` (limited access)
- **Authorization**: Use `auth().has({ role: 'org:admin' })` for server-side checks
- **Components**: `<Protect>`, `<OrganizationSwitcher>`, `<OrganizationProfile>`
- **Hooks**: `useAuth()`, `useOrganization()`, `useOrganizationList()`

### Essential Code Patterns

#### Server-Side Role Checking
```typescript
import { auth } from '@clerk/nextjs/server'

export const checkOrgRole = async (role: 'org:admin' | 'org:member') => {
  const { has } = await auth()
  return has({ role })
}
```

#### Middleware Protection
```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isAdminRoute(req)) {
    const { has } = await auth()
    if (!has({ role: 'org:admin' })) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }
})
```

#### UI Protection
```tsx
import { Protect } from '@clerk/nextjs'

<Protect role="org:admin" fallback={<div>Admin only content</div>}>
  <AdminDashboard />
</Protect>
```

#### Client-Side Role Checking
```tsx
import { useAuth } from '@clerk/nextjs'

const { has } = useAuth()
const isAdmin = has({ role: 'org:admin' })
```

## Success Criteria:
- ✅ Admin users can manage organization members
- ✅ Regular users cannot access admin features
- ✅ Data is properly isolated by organization
- ✅ Organization switching works seamlessly
- ✅ All routes and APIs respect role permissions

## Security Considerations:
- All admin routes protected at middleware level
- Server-side role verification for all sensitive operations
- Organization-scoped data access throughout application
- Proper error handling for unauthorized access attempts

## Estimated Timeline: ~3.5 hours
This plan provides a complete RBAC implementation using Clerk's built-in organization system with comprehensive admin/user role separation.

## Next Steps:
1. Enable organizations in Clerk Dashboard
2. Begin Phase 2 implementation with core auth infrastructure
3. Work through phases systematically, testing each component
4. Validate complete RBAC functionality before deployment