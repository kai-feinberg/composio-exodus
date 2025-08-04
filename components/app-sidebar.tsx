'use client';

import type { User } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useAuth, Protect } from '@clerk/nextjs';

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
import { Bot, Settings, Shield, TestTube } from 'lucide-react';

export function AppSidebar({ user }: { user: User | undefined }) {
  const router = useRouter();
  const { setOpenMobile } = useSidebar();
  const { has } = useAuth();

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 shadow-lg border-r border-sidebar-border/50">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-sidebar/50 backdrop-blur supports-[backdrop-filter]:bg-sidebar/75">
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center py-1">
            <Link
              href="/"
              onClick={() => {
                setOpenMobile(false);
              }}
              className="flex flex-row gap-3 items-center group"
            >
              <span className="text-lg font-bold px-3 py-2 hover:bg-sidebar-accent/70 rounded-lg transition-all duration-200 cursor-pointer text-sidebar-foreground group-hover:scale-[1.02]">
                Exodus AI
              </span>
            </Link>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="p-2.5 h-fit hover:bg-sidebar-accent/70 rounded-lg transition-all duration-200 hover:scale-105"
                  onClick={() => {
                    setOpenMobile(false);
                    router.push('/');
                    router.refresh();
                  }}
                >
                  <PlusIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent align="end" className="font-medium">
                New Chat
              </TooltipContent>
            </Tooltip>
          </div>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4 sidebar-scrollbar">
        {user && (
          <>
            {/* Regular user links */}
            <div className="space-y-1 mb-4">
              <SidebarMenu>
                {/* Connections - available to all users */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-sidebar-accent/70 transition-all duration-200"
                  >
                    <Link
                      href="/connections"
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    >
                      <Settings className="size-4 text-sidebar-foreground/70" />
                      <span className="font-medium">Connected Services</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Browse agents - available to all users */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-sidebar-accent/70 transition-all duration-200"
                  >
                    <Link
                      href="/agents/browse"
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    >
                      <Bot className="size-4 text-sidebar-foreground/70" />
                      <span className="font-medium">Browse Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Manual Test - available to all users */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-sidebar-accent/70 transition-all duration-200"
                  >
                    <Link
                      href="/manual-test"
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    >
                      <TestTube className="size-4 text-sidebar-foreground/70" />
                      <span className="font-medium">Manual Test</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </div>
          </>
        )}
        <SidebarHistory user={user} />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/50 bg-sidebar/50 backdrop-blur supports-[backdrop-filter]:bg-sidebar/75 mt-auto">
        {user && (
          <>
            {/* Admin section - only visible to org:admin users */}
            <Protect role="org:admin" fallback={null}>
              <SidebarSeparator className="my-3 bg-sidebar-border/70" />
              <div className="px-3 py-2">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-widest rounded-md bg-sidebar-accent/30">
                  <Shield className="size-3" />
                  <span>Admin Panel</span>
                </div>
              </div>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-sidebar-accent/70 transition-all duration-200"
                  >
                    <Link
                      href="/agents"
                      onClick={() => setOpenMobile(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                    >
                      <Bot className="size-4 text-sidebar-foreground/70" />
                      <span className="font-medium">Manage Agents</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </Protect>

            <div className="mt-4 pt-3 border-t border-sidebar-border/50">
              <SidebarUserNav user={user} />
            </div>
          </>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
