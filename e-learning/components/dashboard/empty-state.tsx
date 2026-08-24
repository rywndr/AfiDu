import type { ReactNode } from 'react';

import type { LucideIcon } from 'lucide-react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconTile, iconTileVariants } from '@/components/ui/icon-tile';

type IconTone = NonNullable<Parameters<typeof iconTileVariants>[0]>['tone'];

export function EmptyState({
  icon: Icon,
  title,
  tone,
  action,
  children,
}: {
  icon: LucideIcon;
  title?: string;
  tone?: IconTone;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
      <EmptyHeader>
        <EmptyMedia>
          <IconTile tone={tone}>
            <Icon aria-hidden="true" />
          </IconTile>
        </EmptyMedia>
        {title ? (
          <EmptyTitle className="text-lg font-bold text-ink sm:text-xl">
            {title}
          </EmptyTitle>
        ) : null}
        <EmptyDescription>{children}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
