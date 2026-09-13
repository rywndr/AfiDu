import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, Users } from 'lucide-react';

import { BackLink } from '@/components/dashboard/back-link';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { buttonVariants } from '@/components/ui/button';
import { isSubmissionRowStatus } from '@/lib/choices';
import { pluralize } from '@/lib/format';
import { parseRouteUuid } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getAssignmentDetail, listAssignmentSubmissions } from '@/lib/assignments';
import { getClassDetailBySlug } from '@/lib/study-materials';

import { DeleteAssignmentButton } from '../assignment-actions';
import { AssignmentFacts } from './assignment-facts';
import { SubmissionCard } from './submission-card';
import { SubmissionToolbar } from './submission-toolbar';

type AssignmentPageProps = PageProps<'/teacher/assignment/[classId]/[assignmentId]'>;

/** Resolve the public class slug and assignment UUID to the internal class key. */
async function routeIds(params: AssignmentPageProps['params']) {
  const { classId: classSlug, assignmentId } = await params;
  const assignmentPublicId = parseRouteUuid(assignmentId);
  const detail = await getClassDetailBySlug(classSlug);

  return detail && assignmentPublicId !== null
    ? { classSlug, classId: detail.id, assignmentId: assignmentPublicId, detail }
    : { classSlug: null, classId: null, assignmentId: null, detail: null };
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

/** The search and filter state of the submission list. */
function readSearchParams(params: Awaited<AssignmentPageProps['searchParams']>) {
  const statusValue = String(params.status ?? '');
  const requestedPage = Number(params.page ?? 1);

  return {
    query: String(params.q ?? '').trim().slice(0, 100),
    status: isSubmissionRowStatus(statusValue) ? statusValue : undefined,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

export default async function AssignmentSubmissionsPage({
  params,
  searchParams,
}: AssignmentPageProps) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const route = await routeIds(params);
  if (
    route.classSlug === null ||
    route.classId === null ||
    route.assignmentId === null ||
    route.detail === null
  ) {
    notFound();
  }

  const { classSlug, classId, assignmentId, detail: classDetail } = route;
  const item = await getAssignmentDetail(classId, assignmentId);
  if (!item) notFound();

  const { query, status, page } = readSearchParams(await searchParams);
  const submissionPage = await listAssignmentSubmissions(classId, assignmentId, {
    query,
    status,
    page,
  });
  const rows = submissionPage.items;
  const awaiting = submissionPage.awaitingCount;
  const filtering = Boolean(query || status);
  const basePath = `/teacher/assignment/${classSlug}/${assignmentId}`;

  return (
    <>
      <BackLink href={`/teacher/assignment/${classSlug}`}>
        {classDetail.name} assignments
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
            {item.status !== 'published' ? (
              <Link
                href={`/teacher/assignment/${classSlug}/${assignmentId}/edit`}
                className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              >
                <Pencil aria-hidden="true" />
                Edit assignment
              </Link>
            ) : null}
            <DeleteAssignmentButton
              classId={classId}
              assignmentId={assignmentId}
              title={item.title}
              submissionCount={item.submissionCount}
            />
          </div>
        }
      />

      <AssignmentFacts item={item} classSlug={classSlug} />

      <section aria-labelledby="submissions-heading">
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
          <h2
            id="submissions-heading"
            className="text-lg font-bold tracking-tight text-ink sm:text-xl lg:shrink-0 lg:py-2"
          >
            Students ({submissionPage.total}
            {filtering ? ' found' : ''})
          </h2>

          <div className="min-w-0 lg:max-w-2xl lg:flex-1">
            <SubmissionToolbar query={query} status={status} />
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            action={
              filtering ? (
                <Link
                  href={basePath}
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  Clear filters
                </Link>
              ) : null
            }
          >
            {filtering
              ? 'No students match the current search and filters.'
              : `No students are assigned to ${classDetail.name} yet, so there is nothing to mark.`}
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-3 sm:gap-4">
            {rows.map((row) => (
              <li key={`${row.studentId}-${row.submissionId ?? 'none'}`}>
                <SubmissionCard
                  row={row}
                  classId={classId}
                  classSlug={classSlug}
                  assignmentId={assignmentId}
                  maxPoints={item.maxPoints}
                />
              </li>
            ))}
          </ul>
        )}

        <QueryPagination
          pathname={basePath}
          page={submissionPage.page}
          totalPages={submissionPage.totalPages}
          query={{ q: query || undefined, status }}
        />
      </section>
    </>
  );
}
