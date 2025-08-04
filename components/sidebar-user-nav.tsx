'use client';

import { ChevronUp, Crown } from 'lucide-react';
import Image from 'next/image';
import {
  useClerk,
  useUser,
  useAuth,
  OrganizationSwitcher,
} from '@clerk/nextjs';
import { useTheme } from 'next-themes';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { toast } from './toast';
import { LoaderIcon } from './icons';

interface UserProps {
  id: string;
  email?: string | null;
}

export function SidebarUserNav({ user: initialUser }: { user: UserProps }) {
  const router = useRouter();
  const { signOut } = useClerk();
  const { user, isLoaded } = useUser();
  const { setTheme, resolvedTheme } = useTheme();
  const { has } = useAuth();
  const isAdmin = has?.({ role: 'org:admin' }) ?? false;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {!isLoaded ? (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-10 justify-between">
                <div className="flex flex-row gap-2">
                  <div className="size-6 bg-zinc-500/30 rounded-full animate-pulse" />
                  <span className="bg-zinc-500/30 text-transparent rounded-md animate-pulse">
                    Loading auth status
                  </span>
                </div>
                <div className="animate-spin text-zinc-500">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                data-testid="user-nav-button"
                className={`data-[state=open]:bg-sidebar-accent bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-10 ${
                  isAdmin
                    ? 'ring-2 ring-yellow-500/50 border-yellow-500/30'
                    : ''
                }`}
              >
                <div className="relative">
                  <Image
                    src={
                      user?.imageUrl ||
                      `https://avatar.vercel.sh/${user?.emailAddresses[0]?.emailAddress}`
                    }
                    alt={user?.emailAddresses[0]?.emailAddress ?? 'User Avatar'}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  {isAdmin && (
                    <Crown className="absolute -top-1 -right-1 size-3 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
                <span data-testid="user-email" className="truncate">
                  {user?.emailAddresses[0]?.emailAddress}
                  {isAdmin && (
                    <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-md font-medium">
                      Admin
                    </span>
                  )}
                </span>
                <ChevronUp className="ml-auto" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            {/* Organization Switcher */}
            <div className="px-2 py-1">
              <OrganizationSwitcher
                appearance={{
                  elements: {
                    organizationSwitcherTrigger:
                      'w-full justify-start text-sm border-none shadow-none bg-transparent hover:bg-accent',
                    organizationSwitcherTriggerIcon: 'size-4',
                  },
                }}
                hidePersonal={false}
                createOrganizationMode="modal"
                organizationProfileMode="modal"
              />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="user-nav-item-theme"
              className="cursor-pointer"
              onSelect={() =>
                setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
              }
            >
              {`Toggle ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  if (!isLoaded) {
                    toast({
                      type: 'error',
                      description:
                        'Checking authentication status, please try again!',
                    });
                    return;
                  }

                  signOut(() => router.push('/'));
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
