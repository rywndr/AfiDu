'use client';

import { BookOpen, ClipboardCheck, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { roleAccent, type DashboardRole } from '@/components/dashboard/role-theme';
import { cn } from '@/lib/utils';

type SidebarNavProps = {
  role: DashboardRole;
  onNavigate?: () => void;
};

const navigation = [
  { label: 'Dashboard', segment: '', icon: LayoutDashboard },
  { label: 'Module', segment: 'module', icon: BookOpen },
  { label: 'Assignment', segment: 'assignment', icon: ClipboardCheck },
] as const;

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const basePath = `/${role}`;

  return (
    <nav aria-label={`${role} navigation`}>
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
    </nav>
  );
}
