import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Lock } from 'lucide-react';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';
import { isB2Configured } from '@/lib/b2';
import { parseRouteId } from '@/lib/route-params';
import { requireStudentProfile } from '@/lib/student-access';
import { getStudentAssignmentView } from '@/lib/student-attempts';

import { AssignmentBrief } from './assignment-brief';
import { AttemptForm } from './attempt-form';
import { AttemptResult } from './attempt-result';
import { StartAttempt } from './start-attempt';

export const metadata: Metadata = {
  title: 'Assignment | AfiDu E-Learning',
};

export default async function StudentAssignmentDetailPage({
  params,
}: PageProps<'/student/assignment/[assignmentId]'>) {
  const profile = await requireStudentProfile();
  if (!profile || profile.classId === null) redirect('/student/assignment');

  const assignmentId = parseRouteId((await params).assignmentId);
  if (Number.isNaN(assignmentId)) notFound();

  const view = await getStudentAssignmentView(
    profile.id,
    profile.classId,
    assignmentId,
  );
  if (!view) notFound();

  const { assignment, questions, gate, attempt, isWorking, secondsRemaining } = view;

  return (
    <>
      <BackLink href="/student/assignment">All assignments</BackLink>

      <PageHeader
        title={assignment.title.toUpperCase()}
        description={gate.notice ?? undefined}
      />

      <AssignmentBrief item={assignment} />

      {isWorking && attempt ? (
        <AttemptForm
          assignment={assignment}
          questions={questions}
          attempt={attempt}
          storageReady={isB2Configured()}
          secondsRemaining={secondsRemaining}
        />
      ) : gate.canStart ? (
        <StartAttempt
          assignmentId={assignment.id}
          attemptNumber={assignment.attemptsUsed + 1}
        />
      ) : null}

      {attempt && !isWorking ? (
        <AttemptResult
          assignment={assignment}
          questions={questions}
          attempt={attempt}
        />
      ) : null}

      {!attempt && !gate.canStart ? (
        <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
          <EmptyHeader>
            <EmptyMedia>
              <IconTile>
                <Lock aria-hidden="true" />
              </IconTile>
            </EmptyMedia>
            <EmptyTitle className="text-lg font-bold text-ink sm:text-xl">
              Not open for you
            </EmptyTitle>
            <EmptyDescription>
              {gate.notice ??
                'This assignment cannot be started right now. Ask your teacher if you think that is wrong.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </>
  );
}
