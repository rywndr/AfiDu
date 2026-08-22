'use client';

import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { BrandMark } from '@/components/dashboard/brand-mark';
import type { DashboardRole } from '@/components/dashboard/role-theme';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type MobileNavProps = {
  role: DashboardRole;
};

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn !== null && openedOn === pathname;
  const close = () => setOpenedOn(null);

  return (
    <Sheet open={open} onOpenChange={(next) => setOpenedOn(next ? pathname : null)}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="-ml-1 size-10 rounded-xl text-ink-soft lg:hidden"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu aria-hidden="true" className="size-5" />
      </SheetTrigger>

      <SheetContent
        side="left"
        className="max-w-[82vw] gap-8 bg-white px-4 py-5 data-[side=left]:w-64"
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <BrandMark role={role} onClick={close} className="px-1" />
        <SidebarNav role={role} onNavigate={close} />
      </SheetContent>
    </Sheet>
  );
}
