import Link from 'next/link';
import {
  BookOpen,
  CalendarClock,
  CircleCheck,
  ClipboardCheck,
  Hourglass,
  ListChecks,
  Pencil,
  Repeat,
  Timer,
  Users,
} from 'lucide-react';

import { SurfaceCard } from '@/components/dashboard/surfaces';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { AssignmentSummary } from '@/lib/assignments';
import { statusBadgeClass } from '@/lib/choices';
import { formatDateTime, formatScore } from '@/lib/format';
import type { ListView } from '@/lib/list-view';
import { cn } from '@/lib/utils';

import { DeleteAssignmentMenu } from './assignment-actions';

type AssignmentCardProps = {
  item: AssignmentSummary;
  classId: number;
  view: ListView;
};

type AssignmentLayoutProps = Omit<AssignmentCardProps, 'view'>;

function AssignmentIcon({ item }: { item: AssignmentSummary }) {
  return (
    <IconTile tone={item.awaitingGradingCount > 0 ? 'warm' : 'cool'}>
      <ClipboardCheck aria-hidden="true" strokeWidth={1.8} />
    </IconTile>
  );
}

function AssignmentBadges({ item }: { item: AssignmentSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={cn('capitalize', statusBadgeClass(item.status))}>
        {item.status}
      </Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{item.category}</Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{item.level}</Badge>
    </div>
  );
}

function AssignmentMeta({ item }: { item: AssignmentSummary }) {
  return (
    <div className="mt-2 flex flex-col gap-1 text-xs text-ink-subtle">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          {item.dueAt ? `Due ${formatDateTime(item.dueAt)}` : 'No due date'}
          {item.dueAt && item.allowLate ? ' · late allowed' : ''}
        </span>
        {item.openAt ? (
          <span className="flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-3.5 shrink-0" />
            Opens {formatDateTime(item.openAt)}
          </span>
        ) : null}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <ListChecks aria-hidden="true" className="size-3.5 shrink-0" />
          {item.questionCount} question{item.questionCount === 1 ? '' : 's'} ·{' '}
          {formatScore(item.maxPoints)} point
          {formatScore(item.maxPoints) === '1' ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat aria-hidden="true" className="size-3.5 shrink-0" />
          {item.maxAttempts} attempt{item.maxAttempts === 1 ? '' : 's'}
        </span>
        {item.timeLimitMinutes ? (
          <span className="flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-3.5 shrink-0" />
            {item.timeLimitMinutes} min limit
          </span>
        ) : null}
      </p>
      {item.materialId && item.materialTitle ? (
        <p className="flex items-center gap-1.5">
          <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">Reads {item.materialTitle}</span>
        </p>
      ) : null}
    </div>
  );
}

function SubmissionCounts({ item }: { item: AssignmentSummary }) {
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
      <span className="flex items-center gap-1.5">
        <Users aria-hidden="true" className="size-3.5" />
        {item.submissionCount} submission{item.submissionCount === 1 ? '' : 's'}
      </span>
      {item.awaitingGradingCount > 0 ? (
        <span className="flex items-center gap-1.5 text-accent-warm-strong">
          <Hourglass aria-hidden="true" className="size-3.5" />
          {item.awaitingGradingCount} to mark
        </span>
      ) : null}
      {item.gradedCount > 0 ? (
        <span className="flex items-center gap-1.5 text-accent-primary">
          <CircleCheck aria-hidden="true" className="size-3.5" />
          {item.gradedCount} marked
        </span>
      ) : null}
    </p>
  );
}

function AssignmentActions({ item, classId }: AssignmentLayoutProps) {
  return (
    <>
      <Link
        href={`/teacher/assignment/${classId}/${item.id}`}
        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
      >
        <Users aria-hidden="true" />
        Submissions
      </Link>
      {item.status !== 'published' ? (
        <Link
          href={`/teacher/assignment/${classId}/${item.id}/edit`}
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          <Pencil aria-hidden="true" />
          Edit
        </Link>
      ) : null}
      <DeleteAssignmentMenu
        classId={classId}
        assignmentId={item.id}
        title={item.title}
        submissionCount={item.submissionCount}
      />
    </>
  );
}

/** Wide layout: icon, details and actions on one line. */
function AssignmentRow({ item, classId }: AssignmentLayoutProps) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <AssignmentIcon item={item} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/teacher/assignment/${classId}/${item.id}`}
                  className="text-base font-semibold break-words text-ink-strong hover:underline"
                >
                  {item.title}
                </Link>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-2">
                  <AssignmentBadges item={item} />
                </div>

                <AssignmentMeta item={item} />
                <SubmissionCounts item={item} />
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end">
                <AssignmentActions item={item} classId={classId} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

/** Narrow layout: the same details stacked, actions pinned to the bottom. */
function AssignmentTile({ item, classId }: AssignmentLayoutProps) {
  return (
    <SurfaceCard className="h-full">
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <AssignmentIcon item={item} />

          <div className="min-w-0 flex-1">
            <Link
              href={`/teacher/assignment/${classId}/${item.id}`}
              className="line-clamp-2 text-base font-semibold break-words text-ink-strong hover:underline"
            >
              {item.title}
            </Link>
            <div className="mt-2">
              <AssignmentBadges item={item} />
            </div>
          </div>
        </div>

        {item.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{item.description}</p>
        ) : null}

        <AssignmentMeta item={item} />
        <SubmissionCounts item={item} />

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <AssignmentActions item={item} classId={classId} />
        </div>
      </CardContent>
    </SurfaceCard>
  );
}

export function AssignmentCard({ view, ...props }: AssignmentCardProps) {
  return view === 'grid' ? <AssignmentTile {...props} /> : <AssignmentRow {...props} />;
}
