import {
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  type LucideIcon,
} from 'lucide-react';

import {
  DashboardSection,
  SurfaceCard,
  surfaceCardBody,
} from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { IconTile, iconTileVariants } from '@/components/ui/icon-tile';
import { Skeleton } from '@/components/ui/skeleton';

type PlaceholderSectionProps = {
  title: string;
  kind: 'cards' | 'rows';
};

type IconTone = NonNullable<Parameters<typeof iconTileVariants>[0]>['tone'];

const statCards: Array<{
  label: string;
  icon: LucideIcon;
  tone: IconTone;
}> = [
  { label: 'Students', icon: GraduationCap, tone: 'primary' },
  { label: 'Modules', icon: BookOpen, tone: 'warm' },
  { label: 'Assignments', icon: ClipboardCheck, tone: 'cool' },
];

export function StatsPlaceholder() {
  return (
    <section aria-labelledby="stats-heading">
      <h2 id="stats-heading" className="sr-only">
        Dashboard statistics
      </h2>
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        {statCards.map(({ label, icon: Icon, tone }) => (
          <SurfaceCard key={label} className="min-h-24 sm:min-h-28">
            <CardContent className={surfaceCardBody.tile}>
              <IconTile tone={tone}>
                <Icon aria-hidden="true" strokeWidth={1.8} />
              </IconTile>
              <div className="min-w-0">
                <Skeleton className="mb-2 h-4 w-16 bg-placeholder" />
                <p className="truncate text-sm font-semibold text-ink sm:text-base">
                  {label}
                </p>
                <span className="text-xs text-ink-subtle">Coming soon</span>
              </div>
            </CardContent>
          </SurfaceCard>
        ))}
      </div>
    </section>
  );
}

export function PlaceholderSection({ title, kind }: PlaceholderSectionProps) {
  const isCards = kind === 'cards';

  return (
    <DashboardSection
      title={title}
      aside={
        <span className="shrink-0 text-xs font-semibold text-ink-subtle sm:text-sm">
          Placeholder
        </span>
      }
    >
      <div
        className={
          isCards
            ? 'grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
            : 'overflow-hidden rounded-2xl bg-white'
        }
      >
        {[0, 1, 2].map((item) => (
          <SurfaceCard
            key={item}
            variant={isCards ? 'tile' : 'row'}
            className={
              isCards ? 'min-h-28 sm:min-h-36' : 'min-h-18 sm:min-h-20'
            }
          >
            <CardContent
              className={isCards ? surfaceCardBody.tile : surfaceCardBody.row}
            >
              <Skeleton className="size-9 shrink-0 rounded-xl bg-placeholder sm:size-10" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-3.5 w-2/5 bg-placeholder" />
                <Skeleton className="mt-2 h-2.5 w-3/5 bg-placeholder-soft" />
              </div>
            </CardContent>
          </SurfaceCard>
        ))}
      </div>
    </DashboardSection>
  );
}

export function EmptyDashboardPage({ label }: { label: string }) {
  return (
    <SurfaceCard variant="empty">
      <CardContent className="px-5 py-12 sm:px-10 sm:py-16">
        <IconTile className="mx-auto">
          {label === 'Module' ? (
            <BookOpen aria-hidden="true" />
          ) : (
            <ClipboardCheck aria-hidden="true" />
          )}
        </IconTile>
        <h2 className="mt-5 text-lg font-bold text-ink sm:text-xl">
          {label} page placeholder
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          This page is ready for the {label.toLowerCase()} experience when its data and
          workflows are implemented.
        </p>
      </CardContent>
    </SurfaceCard>
  );
}
