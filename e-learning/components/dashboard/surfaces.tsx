import type { ReactNode } from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const surfaceCardVariants = cva('py-0 ring-0', {
  variants: {
    variant: {
      tile: 'justify-center rounded-2xl border-0 shadow-card',
      row: 'justify-center rounded-none border-0 border-b border-shell-divider last:border-b-0',
    },
  },
  defaultVariants: {
    variant: 'tile',
  },
});

function SurfaceCard({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof Card> & VariantProps<typeof surfaceCardVariants>) {
  return <Card className={cn(surfaceCardVariants({ variant }), className)} {...props} />;
}

const surfaceCardBody = {
  tile: 'flex items-center gap-3.5 p-4 sm:gap-4 sm:p-5',
  row: 'flex items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-7 sm:py-4',
} as const;

type DashboardSectionProps = {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
};

function DashboardSection({ title, aside, children }: DashboardSectionProps) {
  const headingId = `${title.toLowerCase()}-heading`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-4">
        <h2
          id={headingId}
          className="text-lg font-bold tracking-tight text-ink sm:text-xl lg:text-2xl"
        >
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export { DashboardSection, SurfaceCard, surfaceCardBody, surfaceCardVariants };
