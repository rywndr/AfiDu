import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Users } from 'lucide-react';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { buttonVariants } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';
import { pluralize } from '@/lib/format';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getAssignmentDetail, listAssignmentSubmissions } from '@/lib/assignments';
import { getClassDetail } from '@/lib/study-materials';

import { DeleteAssignmentButton } from '../assignment-actions';
import { AssignmentFacts } from './assignment-facts';
import { SubmissionCard } from './submission-card';

type AssignmentPageProps = PageProps<'/teacher/assignment/[classId]/[assignmentId]'>;

/** Both ids of the route, or nulls if either is not a usable id. */
async function routeIds(params: AssignmentPageProps['params']) {
  const { classId, assignmentId } = await params;
  const classIdNumber = parseRouteId(classId);
  const assignmentIdNumber = parseRouteId(assignmentId);
  const usable = !Number.isNaN(classIdNumber) && !Number.isNaN(assignmentIdNumber);

  return usable
    ? { classId: classIdNumber, assignmentId: assignmentIdNumber }
    : { classId: null, assignmentId: null };
}

export async function generateMetadata({
  params,
}: AssignmentPageProps): Promise<Metadata> {
  const { classId, assignmentId } = await routeIds(params);
  const item =
    classId === null || assignmentId === null
      ? null
      : await getAssignmentDetail(classId, assignmentId);

  return {
    title: item
      ? `${item.title} submissions | AfiDu E-Learning`
      : 'Submissions | AfiDu E-Learning',
  };
}

export default async function AssignmentSubmissionsPage({
  params,
}: AssignmentPageProps) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const { classId, assignmentId } = await routeIds(params);
  if (classId === null || assignmentId === null) notFound();

  const [detail, item] = await Promise.all([
    getClassDetail(classId),
    getAssignmentDetail(classId, assignmentId),
  ]);
  if (!detail || !item) notFound();

  const rows = await listAssignmentSubmissions(classId, assignmentId);
  const awaiting = rows.filter((row) => row.status === 'submitted').length;

  return (
    <>
      <BackLink href={`/teacher/assignment/${classId}`}>
        {detail.name} assignments
      </BackLink>

      <PageHeader
        title={item.title.toUpperCase()}
        description={
          awaiting > 0
            ? `${pluralize(awaiting, 'submission')} waiting to be marked.`
            : 'Every submission that has come in is marked.'
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/teacher/assignment/${classId}/${assignmentId}/edit`}
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
            >
              <Pencil aria-hidden="true" />
              Edit assignment
            </Link>
            <DeleteAssignmentButton
              classId={classId}
              assignmentId={assignmentId}
              title={item.title}
              submissionCount={item.submissionCount}
            />
          </div>
        }
      />

      <AssignmentFacts item={item} />

      <section aria-labelledby="submissions-heading">
        <h2
          id="submissions-heading"
          className="mb-3 text-lg font-bold tracking-tight text-ink sm:mb-4 sm:text-xl"
        >
          Students ({rows.length})
        </h2>

        {rows.length === 0 ? (
          <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
            <EmptyHeader>
              <EmptyMedia>
                <IconTile>
                  <Users aria-hidden="true" />
                </IconTile>
              </EmptyMedia>
              <EmptyDescription>
                No students are assigned to {detail.name} yet, so there is nothing
                to mark. Students are added to classes in the internal AfiDu app.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3 sm:gap-4">
            {rows.map((row) => (
              <li key={`${row.studentId}-${row.submissionId ?? 'none'}`}>
                <SubmissionCard
                  row={row}
                  classId={classId}
                  assignmentId={assignmentId}
                  maxPoints={item.maxPoints}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
