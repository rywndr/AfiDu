import { SurfaceCard, surfaceCardBody } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { listViewClass, type ListView } from '@/lib/list-view';
import { cn } from '@/lib/utils';

function Bar({ className, ...props }: React.ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn('bg-placeholder', className)} {...props} />;
}

function ToolbarSkeleton() {
  return (
    <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-start">
      <Bar className="h-11 w-full rounded-lg lg:h-10 lg:flex-1" />
      <div className="grid grid-cols-2 gap-2 lg:contents">
        <Bar className="h-11 w-full rounded-lg lg:h-10 lg:w-44" />
        <Bar className="h-11 w-full rounded-lg lg:h-10 lg:w-44" />
      </div>
      <Bar className="hidden h-10 w-20 shrink-0 rounded-lg lg:block" />
    </div>
  );
}

type PageHeaderSkeletonProps = {
  tone?: 'default' | 'accent';
  toolbar?: boolean;
  backLink?: boolean;
};

export function PageHeaderSkeleton({
  tone = 'default',
  toolbar = false,
  backLink = false,
}: PageHeaderSkeletonProps) {
  const isAccent = tone === 'accent';

  return (
    <>
      <span role="status" className="sr-only">
        Loading
      </span>
      {backLink ? <Bar className="h-5 w-28" aria-hidden="true" /> : null}
      <header
        aria-hidden="true"
        className={
          isAccent
            ? 'rounded-2xl bg-accent-primary px-5 py-6 shadow-accent sm:rounded-3xl sm:px-8 sm:py-9 lg:px-10 lg:py-11'
            : 'py-1'
        }
      >
        <Skeleton
          className={cn(
            'h-7 w-3/4 max-w-xs sm:h-8 lg:h-9',
            isAccent ? 'bg-white/25' : 'bg-placeholder',
          )}
        />
        <Skeleton
          className={cn(
            'mt-1.5 h-5 w-full max-w-md sm:mt-2 sm:h-6 lg:h-7',
            isAccent ? 'bg-white/20' : 'bg-placeholder',
          )}
        />
        {toolbar ? (
          <div className="mt-5 sm:mt-6">
            <ToolbarSkeleton />
          </div>
        ) : null}
      </header>
    </>
  );
}

/** The icon, two text lines and badge row every module and class card shares. */
function CardSkeleton() {
  return (
    <SurfaceCard className="h-full">
      <CardContent className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
        <Bar className="size-12 shrink-0 rounded-2xl sm:size-14" />
        <div className="min-w-0 flex-1">
          <Bar className="h-4 w-3/5" />
          <Bar className="mt-2 h-3 w-4/5" />
          <div className="mt-2.5 flex gap-1.5">
            <Bar className="h-5 w-16 rounded-full" />
            <Bar className="h-5 w-20 rounded-full" />
          </div>
        </div>
        <Bar className="mt-1 size-5 shrink-0" />
      </CardContent>
    </SurfaceCard>
  );
}

/** A row inside the joined panel the two dashboards use. */
function PanelRowSkeleton() {
  return (
    <div className={surfaceCardBody.row}>
      <Bar className="size-12 shrink-0 rounded-2xl sm:size-14" />
      <div className="min-w-0 flex-1">
        <Bar className="h-4 w-1/2" />
        <Bar className="mt-2 h-3 w-3/4" />
      </div>
      <Bar className="hidden h-6 w-20 shrink-0 rounded-full sm:block" />
    </div>
  );
}

type ListSkeletonProps =
  /** Gap-separated cards, laid out by the `view` the page was asked for. */
  | { kind: 'cards'; view: ListView; count?: number }
  /** The fixed grid the two class-picker pages use, which has no view switch. */
  | { kind: 'tiles'; count?: number }
  /** One rounded white block with divided rows, as on the dashboards. */
  | { kind: 'panel'; count?: number };

/** Placeholder list for a page whose rows are still being queried. */
export function ListSkeleton(props: ListSkeletonProps) {
  const rows = Array.from({ length: props.count ?? 4 }, (_, index) => index);

  switch (props.kind) {
    case 'cards':
      return (
        <ul aria-hidden="true" className={listViewClass(props.view)}>
          {rows.map((row) => (
            <li key={row}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      );
    case 'tiles':
      return (
        <ul
          aria-hidden="true"
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
        >
          {rows.map((row) => (
            <li key={row}>
              <CardSkeleton />
            </li>
          ))}
        </ul>
      );
    case 'panel':
      return (
        <ul
          aria-hidden="true"
          className="divide-y divide-shell-divider overflow-hidden rounded-2xl bg-white shadow-card"
        >
          {rows.map((row) => (
            <li key={row}>
              <PanelRowSkeleton />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustive: never = props;
      return exhaustive;
    }
  }
}

/** The heading, and optionally the sub-line and aside, above a list. */
export function SectionSkeleton({
  description = true,
  aside = false,
  children,
}: {
  description?: boolean;
  aside?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        aria-hidden="true"
        className="mb-3 flex items-start justify-between gap-3 sm:mb-4"
      >
        <div className="min-w-0 flex-1">
          <Bar className="h-6 w-40 sm:h-7" />
          {description ? <Bar className="mt-1 h-4 w-64 max-w-full" /> : null}
        </div>
        {aside ? <Bar className="mt-1 hidden h-4 w-24 shrink-0 sm:block" /> : null}
      </div>
      {children}
    </section>
  );
}
