import Link from 'next/link';
import { CalendarClock, Clock, Repeat, Timer, TriangleAlert } from 'lucide-react';

import { ScoreTotal, scoreBreakdown } from '@/components/assignments/score';
import { SubmissionStatusPill } from '@/components/assignments/submission-status-pill';
import { MetaItem } from '@/components/dashboard/facts';
import { Pill } from '@/components/dashboard/pill';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { buttonVariants } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { formatDateTime, formatDuration } from '@/lib/format';
import type { SubmissionRow } from '@/lib/assignments';

type SubmissionCardProps = {
  row: SubmissionRow;
  classId: number;
  assignmentId: number;
  maxPoints: string;
};

/** One student, whether or not they have handed anything in. */
export function SubmissionCard({
  row,
  classId,
  assignmentId,
  maxPoints,
}: SubmissionCardProps) {
  const href = row.submissionId
    ? `/teacher/assignment/${classId}/${assignmentId}/submissions/${row.submissionId}`
    : null;
  const breakdown = scoreBreakdown(row.autoScore, row.manualScore);

  return (
    <SurfaceCard>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-semibold break-words text-ink-strong">
              {row.studentName}
            </span>
            <SubmissionStatusPill status={row.status} />
            {row.isLate ? (
              <Pill icon={TriangleAlert} className="bg-destructive/10 text-destructive">
                Late
              </Pill>
            ) : null}
            {row.inClass ? null : (
              <Pill className="bg-shell text-ink-soft">Moved class</Pill>
            )}
          </p>

          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-subtle">
            <span>{row.studentLevel}</span>
            {row.submittedAt ? (
              <MetaItem icon={CalendarClock}>
                Handed in {formatDateTime(row.submittedAt)}
              </MetaItem>
            ) : null}
            {row.timeSpentSeconds !== null ? (
              <MetaItem icon={Timer}>{formatDuration(row.timeSpentSeconds)}</MetaItem>
            ) : null}
            {row.attemptCount > 1 ? (
              <MetaItem icon={Repeat}>
                Attempt {row.attemptNumber} of {row.attemptCount}
              </MetaItem>
            ) : null}
            {row.gradedAt ? (
              <MetaItem icon={Clock}>Marked {formatDateTime(row.gradedAt)}</MetaItem>
            ) : null}
          </p>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
          <div className="text-right">
            <ScoreTotal score={row.totalScore} maxPoints={maxPoints} />
            {breakdown ? (
              <p className="text-xs text-ink-subtle">{breakdown}</p>
            ) : null}
          </div>

          {href ? (
            <Link
              href={href}
              className={buttonVariants({
                variant: row.status === 'submitted' ? 'default' : 'secondary',
                size: 'sm',
              })}
            >
              {row.status === 'submitted' ? 'Mark' : 'View'}
            </Link>
          ) : (
            <span className="text-xs font-semibold text-ink-subtle">
              Nothing to mark
            </span>
          )}
        </div>
      </CardContent>
    </SurfaceCard>
  );
}
