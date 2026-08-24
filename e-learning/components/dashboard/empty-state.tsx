import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';

/** The dashed panel a page shows in place of a list it has nothing to fill with. */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
      <EmptyHeader>
        <EmptyMedia>
          <IconTile>
            <Icon aria-hidden="true" />
          </IconTile>
        </EmptyMedia>
        <EmptyTitle className="text-lg font-bold text-ink sm:text-xl">
          {title}
        </EmptyTitle>
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
