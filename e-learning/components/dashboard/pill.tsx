import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export const pillClass =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function Pill({
  icon: Icon,
  className,
  children,
}: {
  icon?: LucideIcon;
  /** Carries the colours; the shape comes from `pillClass`. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn(pillClass, className)}>
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {children}
    </span>
  );
}
