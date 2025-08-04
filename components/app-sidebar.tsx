'use client';

import type { User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useAuth, OrganizationSwitcher, Protect } from '@clerk/nextjs';

import { PlusIcon } from '@/components/icons';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarUserNav } from '@/components/sidebar-user-nav';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { Bot, Settings, Shield } from 'lucide-react';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { has } = useAuth();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center"
            >
              <span className="text-lg font-semibold px-2 hover:bg-muted rounded-md cursor-pointer text-primary">
                Horde AI
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2 h-fit"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end">New Chat</TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>

        {/* Organization Switcher */}
        {user && (
          <div className="px-2 py-1">
            <OrganizationSwitcher
              appearance={{
                elements: {
                  organizationSwitcherTrigger: 'w-full justify-start text-sm',
                  organizationSwitcherTriggerIcon: 'size-4',
                },
              }}
              hidePersonal={false}
              createOrganizationMode="modal"
              organizationProfileMode="modal"
            />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <>
            {/* Regular user links */}
            <SidebarMenu>
              {/* Connections - available to all users */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/connections"
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="size-4" />
                    <span>Connected Services</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Browse agents - available to all users */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link
                    href="/agents/browse"
                    onClick={() => setOpenMobile(false)}
                    className="flex items-center gap-2"
                  >
                    <Bot className="size-4" />
                    <span>Browse Agents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* Admin section - only visible to org:admin users */}
            <Protect role="org:admin" fallback={null}>
              <SidebarSeparator />
              <div className="px-2 py-1">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Shield className="size-3" />
                  <span>Admin</span>
                </div>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link
                      href="/agents"
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-2"
                    >
                      <Bot className="size-4" />
                      <span>Manage Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </Protect>

            <SidebarUserNav user={user} />
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
