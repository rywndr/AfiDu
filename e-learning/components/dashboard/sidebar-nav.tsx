'use client';

import { BookOpen, ClipboardCheck, ExternalLink, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { roleAccent, type DashboardRole } from '@/components/dashboard/role-theme';
import { managementUrl } from '@/lib/management-links';
import { cn } from '@/lib/utils';

type SidebarNavProps = {
  role: DashboardRole;
  onNavigate?: () => void;
};

const navigation = [
  { label: 'Dashboard', segment: '', icon: LayoutDashboard },
  { label: 'Module', segment: 'module', icon: BookOpen },
  { label: 'Assessments', segment: 'assignment', icon: ClipboardCheck },
] as const;

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const basePath = `/${role}`;

  return (
    <nav aria-label={`${role} navigation`} className="flex flex-1 flex-col">
      <ul className="flex flex-col gap-1.5">
        {navigation.map(({ label, segment, icon: Icon }) => {
          const href = segment ? `${basePath}/${segment}` : basePath;
          const isActive =
            pathname === href || (segment !== '' && pathname.startsWith(`${href}/`));

          return (
            <li key={label}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-semibold transition-colors lg:text-base',
                  isActive
                    ? roleAccent[role].soft
                    : 'text-ink-soft hover:bg-shell hover:text-ink-strong',
                )}
              >
                <Icon aria-hidden="true" className="size-5 shrink-0" strokeWidth={1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-1 pt-8">
        {/* staff-only shortcut: students have no access to the Django app */}
        {role === 'teacher' && (
          <a
            href={managementUrl()}
            onClick={onNavigate}
            className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-shell hover:text-ink-soft"
          >
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2} />
            <span className="leading-none">AfiDu Management</span>
          </a>
        )}

        <p className="px-4 text-[0.7rem] text-ink-subtle">
          &copy; {new Date().getFullYear()} AfiDu. All rights reserved.
        </p>
      </div>
    </nav>
  );
}
