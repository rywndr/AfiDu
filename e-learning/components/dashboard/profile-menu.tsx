'use client';

import { ChevronDown, LogOut } from 'lucide-react';

import { signOutAction } from '@/app/login/actions';
import { roleAccent, type DashboardRole } from '@/components/dashboard/role-theme';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ProfileMenuProps = {
  userName: string;
  accent: DashboardRole;
};

function initialFor(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'A';
}

export function ProfileMenu({ userName, accent }: ProfileMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            className="h-auto gap-1 rounded-full p-1 pr-2 hover:bg-white/70 aria-expanded:bg-white/80"
            aria-label={`Open profile menu for ${userName}`}
          />
        }
      >
        <Avatar className="size-10 border-0 after:border-0 lg:size-12">
          <AvatarFallback
            className={cn(
              'text-lg font-semibold text-white lg:text-xl',
              roleAccent[accent].solid,
            )}
          >
            {initialFor(userName)}
          </AvatarFallback>
        </Avatar>
        <ChevronDown aria-hidden="true" className="size-4 text-ink-muted" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-64 max-w-[calc(100vw-2rem)] p-2"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-2">
            <span className="block text-xs font-medium text-muted-foreground">
              Signed in as
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">
              {userName}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <DropdownMenuItem
            nativeButton
            variant="destructive"
            className="w-full gap-2 px-2 py-2"
            render={<button type="submit" />}
          >
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
