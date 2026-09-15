import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarClock, Repeat, Timer, TriangleAlert, UserRound } from 'lucide-react';

import { ScoreTotal, scoreBreakdown } from '@/components/assignments/score';
import { BackLink } from '@/components/dashboard/back-link';
import { Fact, FactGrid, FactNote, FactValue, MetaItem } from '@/components/dashboard/facts';
import { PageHeader } from '@/components/dashboard/page-header';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { submissionStatusLabel } from '@/lib/choices';
import { formatDateTime, formatDuration } from '@/lib/format';
import { parseRouteUuid } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getSubmissionDetail, type SubmissionDetail } from '@/lib/assignments';
import { getClassDetailBySlug } from '@/lib/study-materials';

import { GradeForm } from './grade-form';

type SubmissionPageProps = PageProps<'/teacher/assignment/[classId]/[assignmentId]/submissions/[submissionId]'>;

/** Resolve the public class slug, assignment UUID, and submission UUID. */
async function routeIds(params: SubmissionPageProps['params']) {
  const { classId: classSlug, assignmentId, submissionId } = await params;
  const detail = await getClassDetailBySlug(classSlug);
  const assignmentPublicId = parseRouteUuid(assignmentId);
  const submissionPublicId = parseRouteUuid(submissionId);

  return detail && assignmentPublicId !== null && submissionPublicId !== null
    ? {
        classSlug,
        classId: detail.id,
        assignmentId: assignmentPublicId,
        submissionId: submissionPublicId,
      }
    : { classSlug: null, classId: null, assignmentId: null, submissionId: null };
}

export function generateMetadata(): Metadata {
  return { title: 'Submission | AfiDu E-Learning' };
}

function SubmissionFacts({ detail }: { detail: SubmissionDetail }) {
  const breakdown = scoreBreakdown(
    detail.autoScore,
    detail.manualScore,
    'not auto-marked',
  );

  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <FactGrid>
          <Fact label="Student">
            <div data-clarity-mask="true">
              <FactValue className="font-semibold text-ink-strong">
                <MetaItem icon={UserRound}>{detail.studentName}</MetaItem>
              </FactValue>
              <FactNote>{detail.studentLevel}</FactNote>
            </div>
          </Fact>

          <Fact label="Handed in">
            <FactValue>
              <MetaItem icon={CalendarClock} align="start">
                <span>
                  {detail.submittedAt
                    ? formatDateTime(detail.submittedAt)
                    : 'Still in progress'}
                  <span className="block text-xs text-ink-subtle">
                    Started {formatDateTime(detail.startedAt)}
                  </span>
                </span>
              </MetaItem>
            </FactValue>
            {detail.isLate ? (
              <FactNote className="mt-1 font-semibold text-destructive">
                <MetaItem icon={TriangleAlert}>Handed in late</MetaItem>
              </FactNote>
            ) : null}
          </Fact>

          <Fact label="Attempt">
            <FactValue>
              <MetaItem icon={Repeat}>
                {detail.attemptNumber} of {detail.attemptCount}
              </MetaItem>
            </FactValue>
            {detail.timeSpentSeconds !== null ? (
              <FactNote className="mt-1">
                <MetaItem icon={Timer}>
                  {formatDuration(detail.timeSpentSeconds)} spent
                </MetaItem>
              </FactNote>
            ) : null}
          </Fact>

          <Fact label="Score">
            <FactValue>
              <ScoreTotal score={detail.totalScore} maxPoints={detail.maxPoints} />
            </FactValue>
            <FactNote>{breakdown}</FactNote>
            {detail.gradedAt ? (
              <FactNote>
                Marked {formatDateTime(detail.gradedAt)}
                {detail.gradedByName ? ` by ${detail.gradedByName}` : ''}
              </FactNote>
            ) : null}
          </Fact>
        </FactGrid>
      </CardContent>
    </SurfaceCard>
  );
}

export default async function SubmissionPage({ params }: SubmissionPageProps) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const route = await routeIds(params);
  if (
    route.classSlug === null ||
    route.classId === null ||
    route.assignmentId === null ||
    route.submissionId === null
  ) {
    notFound();
  }

  const { classSlug, classId, assignmentId, submissionId } = route;

  const detail = await getSubmissionDetail(classId, assignmentId, submissionId);
  if (!detail) notFound();

  return (
    <>
      <BackLink href={`/teacher/assignment/${classSlug}/${assignmentId}`}>
        All submissions
      </BackLink>

      <PageHeader
        title={
          <span data-clarity-mask="true">
            {detail.studentName.toUpperCase()}
          </span>
        }
        description={`${detail.assignmentTitle} · ${submissionStatusLabel(detail.status)}`}
      />

      <SubmissionFacts detail={detail} />

      <GradeForm
        classSlug={classSlug}
        assignmentId={assignmentId}
        submission={detail}
      />
    </>
  );
}
