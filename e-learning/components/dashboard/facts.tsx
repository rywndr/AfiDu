import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

export function FactGrid({ children }: { children: ReactNode }) {
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">{children}</dl>
  );
}

export function Fact({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <dt className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
        {label}
      </dt>
      {children}
    </div>
  );
}

export function FactValue({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <dd className={cn('mt-1 text-ink', className)}>{children}</dd>;
}

export function FactNote({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <dd className={cn('text-xs text-ink-subtle', className)}>{children}</dd>;
}

export function MetaItem({
  icon: Icon,
  align = 'center',
  className,
  children,
}: {
  icon: LucideIcon;
  align?: 'center' | 'start';
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'flex gap-1.5',
        align === 'start' ? 'items-start' : 'items-center',
        className,
      )}
    >
      <Icon
        aria-hidden={true}
        className={cn('size-3.5 shrink-0', align === 'start' && 'mt-0.5')}
      />
      {children}
    </span>
  );
}
