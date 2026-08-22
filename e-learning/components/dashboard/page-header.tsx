import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  tone?: 'default' | 'accent';
  actions?: ReactNode;
};

export function PageHeader({
  title,
  description,
  tone = 'default',
  actions,
}: PageHeaderProps) {
  const isAccent = tone === 'accent';

  return (
    <header
      className={
        isAccent
          ? 'rounded-2xl bg-accent-primary px-5 py-6 text-white shadow-accent sm:rounded-3xl sm:px-8 sm:py-9 lg:px-10 lg:py-11'
          : 'py-1'
      }
    >
      <h1 className="text-xl font-bold tracking-[-0.02em] break-words sm:text-2xl lg:text-3xl">
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            'mt-1.5 text-sm sm:mt-2 sm:text-base lg:text-lg',
            isAccent ? 'text-white/80' : 'text-ink-muted',
          )}
        >
          {description}
        </p>
      ) : null}
      {actions ? <div className="mt-5 sm:mt-6">{actions}</div> : null}
    </header>
  );
}
