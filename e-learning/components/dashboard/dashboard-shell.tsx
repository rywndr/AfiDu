import type { ReactNode } from 'react';

import { BrandMark } from '@/components/dashboard/brand-mark';
import { MobileNav } from '@/components/dashboard/mobile-nav';
import { ProfileMenu } from '@/components/dashboard/profile-menu';
import type { DashboardRole } from '@/components/dashboard/role-theme';
import { SidebarNav } from '@/components/dashboard/sidebar-nav';

type DashboardShellProps = {
  children: ReactNode;
  role: DashboardRole;
  userName: string;
};

export function DashboardShell({ children, role, userName }: DashboardShellProps) {
  return (
    <div className="isolate min-h-dvh bg-shell lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-repeat opacity-10"
        style={{ backgroundImage: "url('/abstract_doodle.webp')", backgroundSize: '400px' }}
      />

      <aside className="hidden border-r border-shell-border bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-14 lg:px-6 lg:py-8">
        <BrandMark role={role} className="px-1" />
        <SidebarNav role={role} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-shell-border bg-white/90 px-4 py-2.5 backdrop-blur-sm lg:static lg:justify-end lg:border-b-0 lg:bg-transparent lg:px-8 lg:pt-6 lg:pb-0 lg:backdrop-blur-none xl:px-12">
          <MobileNav role={role} />
          <BrandMark role={role} size="sm" className="lg:hidden" />
          <div className="ml-auto flex items-center lg:ml-0">
            <ProfileMenu userName={userName} accent={role} />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pt-5 pb-10 sm:px-6 sm:pt-6 lg:px-8 lg:pt-4 lg:pb-12 xl:px-12">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 lg:gap-9">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
