import Image from 'next/image';
import Link from 'next/link';

import type { DashboardRole } from '@/components/dashboard/role-theme';
import { cn } from '@/lib/utils';

type BrandMarkProps = {
  role: DashboardRole;
  size?: 'sm' | 'md';
  className?: string;
  onClick?: () => void;
};

export function BrandMark({ role, size = 'md', className, onClick }: BrandMarkProps) {
  const isSmall = size === 'sm';

  return (
    <Link
      href={`/${role}`}
      onClick={onClick}
      aria-label="AfiDu E-Learning dashboard"
      className={cn(
        'flex w-fit items-start gap-1.5 rounded-lg outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent-primary',
        className,
      )}
    >
      <Image
        src="/afidu-logo.png"
        alt=""
        width={282}
        height={308}
        priority
        className={cn('mt-0.5 w-auto', isSmall ? 'h-8' : 'h-10')}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-bold tracking-tight text-brand',
            isSmall ? 'text-2xl' : 'text-3xl',
          )}
        >
          fiDu
        </span>
        <span
          className={cn(
            'mt-1 font-semibold tracking-[0.12em] text-brand-muted uppercase',
            isSmall ? 'text-[0.625rem]' : 'text-xs',
          )}
        >
          E-Learning
        </span>
      </span>
    </Link>
  );
}
