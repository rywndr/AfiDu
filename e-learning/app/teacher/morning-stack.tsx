import Link from 'next/link';
import {
  CalendarClock,
  CheckCheck,
  ChevronRight,
  FileClock,
  Hourglass,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { Pill } from '@/components/dashboard/pill';
import {
  DashboardSection,
  SurfaceCard,
  surfaceCardBody,
} from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { IconTile, iconTileVariants } from '@/components/ui/icon-tile';
import { formatRelativeDay, formatWeekday, pluralize } from '@/lib/format';
import {
  stackItemKey,
  type TeacherStack,
  type TeacherStackItem,
  type TeacherStackKind,
} from '@/lib/teacher-stack';
import { cn } from '@/lib/utils';

type IconTone = NonNullable<Parameters<typeof iconTileVariants>[0]>['tone'];

type StackStyle = {
  icon: LucideIcon;
  tone: IconTone;
  pill: string;
  label: string;
};

const STACK_STYLES = {
  to_mark: {
    icon: Hourglass,
    tone: 'warm',
    pill: 'bg-accent-warm-soft text-accent-warm-strong',
    label: 'To mark',
  },
  overdue: {
    icon: TriangleAlert,
    tone: 'danger',
    pill: 'bg-destructive/10 text-destructive',
    label: 'Overdue',
  },
  due_soon: {
    icon: CalendarClock,
    tone: 'cool',
    pill: 'bg-accent-cool-soft text-accent-cool',
    label: 'Due soon',
  },
  draft: {
    icon: FileClock,
    tone: 'neutral',
    pill: 'bg-placeholder text-ink-soft',
    label: 'Draft',
  },
} as const satisfies Record<TeacherStackKind, StackStyle>;

/** The line under the title: why this row is here, in the teacher's terms. */
function stackDetail(item: TeacherStackItem, now: Date): string {
  switch (item.kind) {
    case 'to_mark':
      return `${pluralize(item.awaitingCount, 'submission')} waiting to be marked`;
    case 'overdue':
      return item.allowLate
        ? `Due ${formatRelativeDay(item.dueAt, now)}, still open for late work`
        : `Due ${formatRelativeDay(item.dueAt, now)}, late work is not accepted`;
    case 'due_soon':
      return `Due ${formatRelativeDay(item.dueAt, now)}`;
    case 'draft':
      return 'Not published, so no student can see it yet';
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

/** A draft is opened to be finished; everything else, to see who handed in. */
function stackHref(item: TeacherStackItem): string {
  const { classId, id } = item.assignment;
  const base = `/teacher/assignment/${classId}/${id}`;
  return item.kind === 'draft' ? `${base}/edit` : base;
}

function StackRow({ item, now }: { item: TeacherStackItem; now: Date }) {
  const { icon: Icon, tone, pill, label } = STACK_STYLES[item.kind];

  return (
    <Link
      href={stackHref(item)}
      className="block outline-none focus-visible:ring-3 focus-visible:ring-accent-warm/50"
    >
      <SurfaceCard variant="row" className="transition-colors hover:bg-shell/60">
        <CardContent className={surfaceCardBody.row}>
          <IconTile tone={tone}>
            <Icon aria-hidden="true" strokeWidth={1.8} />
          </IconTile>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-strong sm:text-base">
              {item.assignment.title}
              <span className="font-normal text-ink-subtle">
                {' · '}
                {item.assignment.className}
              </span>
            </p>
            <p className="mt-0.5 truncate text-xs text-ink-muted sm:text-sm">
              {stackDetail(item, now)}
            </p>
          </div>

          <Pill className={cn(pill, 'shrink-0')}>{label}</Pill>
          <ChevronRight
            aria-hidden="true"
            className="hidden size-5 shrink-0 text-ink-subtle sm:block"
          />
        </CardContent>
      </SurfaceCard>
    </Link>
  );
}

/** The count under the heading, which is what a teacher reads first. */
function stackSummary(total: number): string {
  if (total === 0) return 'Nothing across your classes needs a look.';
  if (total === 1) return '1 item across your classes needs a look.';
  return `${total} items across your classes need a look.`;
}

export function MorningStack({ stack, now }: { stack: TeacherStack; now: Date }) {
  return (
    <DashboardSection
      title={formatWeekday(now)}
      description={stackSummary(stack.total)}
    >
      {stack.items.length === 0 ? (
        <EmptyState icon={CheckCheck} title="All clear" tone="primary">
          No marking waiting, no due date gone by and no unfinished drafts. New work
          shows up here as soon as a class hands something in.
        </EmptyState>
      ) : (
        <ul className="overflow-hidden rounded-2xl bg-white shadow-card">
          {stack.items.map((item) => (
            <li key={stackItemKey(item)}>
              <StackRow item={item} now={now} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
