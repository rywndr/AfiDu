import Link from 'next/link';
import {
  CalendarClock,
  ChevronRight,
  ClipboardCheck,
  ListChecks,
  Repeat,
} from 'lucide-react';

import { SubmissionStatusPill } from '@/components/assignments/submission-status-pill';
import { DueSoonWarning } from '@/components/assignments/due-soon-warning';
import { MetaItem } from '@/components/dashboard/facts';
import { LinkedNotice } from '@/components/dashboard/linked-notice';
import { Pill } from '@/components/dashboard/pill';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { Badge } from '@/components/ui/badge';
import { CardContent } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { attemptGate } from '@/lib/assignment-availability';
import { formatDateTime, formatScore, pluralize } from '@/lib/format';
import type { StudentAssignment } from '@/lib/student-assignments';

/**
 * One assignment on student's list.
 */
export function StudentAssignmentCard({ item }: { item: StudentAssignment }) {
  const latest = item.latestAttempt;
  const gate = attemptGate({
    ...item,
    hasOpenAttempt: latest?.status === 'in_progress',
  });
  const marked = latest?.totalScore ?? null;
  const linkedModules = item.materialTitle ? [item.materialTitle] : [];

  return (
    <Link
      href={`/student/assignment/${item.id}`}
      className="block rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-accent-warm/50"
    >
      <SurfaceCard className="h-full transition-shadow hover:shadow-accent">
        <CardContent className="flex items-start gap-3.5 p-4 sm:gap-4 sm:p-5">
          <IconTile tone={gate.canWork || gate.canStart ? 'warm' : 'cool'}>
            <ClipboardCheck aria-hidden="true" strokeWidth={1.8} />
          </IconTile>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <p className="min-w-0 flex-1 text-base font-semibold break-words text-ink-strong">
                {item.title}
              </p>
              <SubmissionStatusPill status={latest?.status ?? null} />
            </div>

            {item.description ? (
              <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                {item.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Badge className="bg-shell text-ink-soft capitalize">{item.category}</Badge>
              {marked !== null ? (
                <Badge className="bg-accent-primary-soft text-accent-primary-strong">
                  {formatScore(marked)} / {formatScore(item.maxPoints)}
                </Badge>
              ) : null}
              {latest?.isLate ? (
                <Badge className="bg-accent-warm-soft text-accent-warm-strong">
                  Late
                </Badge>
              ) : null}
            </div>

            <div className="mt-2.5 flex flex-col gap-1 text-xs text-ink-subtle">
              <MetaItem icon={CalendarClock}>
                {item.dueAt ? `Due ${formatDateTime(item.dueAt)}` : 'No due date'}
              </MetaItem>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <MetaItem icon={ListChecks}>
                  {pluralize(item.questionCount, 'question')} ·{' '}
                  {formatScore(item.maxPoints)} points
                </MetaItem>
                <MetaItem icon={Repeat}>
                  {item.attemptsUsed} of {pluralize(item.maxAttempts, 'attempt')} used
                </MetaItem>
              </span>
            </div>

            <DueSoonWarning assignment={item} />

            {linkedModules.length > 0 || gate.notice ? (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <LinkedNotice to="module" titles={linkedModules} />
                {gate.notice ? (
                  <Pill className="bg-shell text-ink-soft">{gate.notice}</Pill>
                ) : null}
              </div>
            ) : null}
          </div>

          <ChevronRight
            aria-hidden="true"
            className="mt-1 size-5 shrink-0 text-ink-subtle"
          />
        </CardContent>
      </SurfaceCard>
    </Link>
  );
}
