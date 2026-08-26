import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ClipboardCheck } from 'lucide-react';
import { Suspense } from 'react';

import { BackLink } from '@/components/dashboard/back-link';
import {
  ClientList,
  ListViewLink,
  ListViewProvider,
} from '@/components/dashboard/client-list-view';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { ListSkeleton, SectionSkeleton } from '@/components/dashboard/skeletons';
import { buttonVariants } from '@/components/ui/button';
import { isAssignmentStatus, isSubjectCategory } from '@/lib/choices';
import { formatClassSchedule, pluralize } from '@/lib/format';
import { parseListView } from '@/lib/list-view';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listClassAssignments } from '@/lib/assignments';
import { getClassDetail } from '@/lib/study-materials';

import { AssignmentCard } from '../assignment-card';
import { AssignmentToolbar } from '../assignment-toolbar';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/assignment/[classId]'>): Promise<Metadata> {
  const { classId } = await params;
  const id = parseRouteId(classId);
  const detail = Number.isNaN(id) ? null : await getClassDetail(id);

  return {
    title: detail
      ? `${detail.name} assignments | AfiDu E-Learning`
      : 'Assignments | AfiDu E-Learning',
  };
}

/** The search, filter and view state. */
function readSearchParams(
  params: Awaited<PageProps<'/teacher/assignment/[classId]'>['searchParams']>,
) {
  const categoryValue = String(params.category ?? '');
  const statusValue = String(params.status ?? '');
  const requestedPage = Number(params.page ?? 1);

  return {
    query: String(params.q ?? '').trim().slice(0, 100),
    category: isSubjectCategory(categoryValue) ? categoryValue : undefined,
    status: isAssignmentStatus(statusValue) ? statusValue : undefined,
    view: parseListView(params.view),
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

type AssignmentSearch = ReturnType<typeof readSearchParams>;
type AssignmentPagePromise = ReturnType<typeof listClassAssignments>;

async function AssignmentDescription({
  detail,
  assignmentPage,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getClassDetail>>>;
  assignmentPage: AssignmentPagePromise;
}) {
  const result = await assignmentPage;

  return `${formatClassSchedule(detail)} · ${pluralize(
    result.allTotal,
    'assignment',
  )}`;
}

async function AssignmentResults({
  classId,
  assignmentPage,
  search,
}: {
  classId: number;
  assignmentPage: AssignmentPagePromise;
  search: AssignmentSearch;
}) {
  const result = await assignmentPage;
  const assignments = result.items;
  const { query, category, status } = search;
  const filtering = Boolean(query || category || status);

  return (
    <section aria-labelledby="assignments-heading">
      <h2
        id="assignments-heading"
        className="mb-3 text-lg font-bold tracking-tight text-ink sm:mb-4 sm:text-xl"
      >
        Assignments{filtering ? ` (${result.total} found)` : ''}
      </h2>

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          action={
            filtering ? (
              <ListViewLink
                href={`/teacher/assignment/${classId}`}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Clear filters
              </ListViewLink>
            ) : (
              <Link
                href={`/teacher/assignment/${classId}/new`}
                className={buttonVariants({ size: 'lg' })}
              >
                New assignment
              </Link>
            )
          }
        >
          {filtering
            ? 'No assignments match the current search and filters.'
            : 'No assignments for this class yet.'}
        </EmptyState>
      ) : (
        <ClientList>
          {assignments.map((item) => (
            <li key={item.id}>
              <AssignmentCard item={item} classId={classId} />
            </li>
          ))}
        </ClientList>
      )}

      <QueryPagination
        pathname={`/teacher/assignment/${classId}`}
        page={result.page}
        totalPages={result.totalPages}
        query={{
          q: query || undefined,
          category,
          status,
        }}
      />
    </section>
  );
}

export default async function ClassAssignmentPage({
  params,
  searchParams,
}: PageProps<'/teacher/assignment/[classId]'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const id = parseRouteId((await params).classId);
  if (Number.isNaN(id)) notFound();

  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const search = readSearchParams(await searchParams);
  const { query, category, status, view, page } = search;
  const assignmentPage = listClassAssignments(id, {
    query,
    category,
    status,
    page,
  });
  const resultsKey = [query, category, status, page].join(':');

  return (
    <ListViewProvider initialView={view}>
      <BackLink href="/teacher/assignment">
        All classes
      </BackLink>

      <PageHeader
        title={detail.name.toUpperCase()}
        description={
          <Suspense fallback={formatClassSchedule(detail)}>
            <AssignmentDescription detail={detail} assignmentPage={assignmentPage} />
          </Suspense>
        }
        actions={
          <AssignmentToolbar
            classId={id}
            query={query}
            category={category}
            status={status}
          />
        }
      />

      <Suspense
        key={resultsKey}
        fallback={
          <>
            <span role="status" className="sr-only">
              Loading assignments
            </span>
            <SectionSkeleton description={false}>
              <ListSkeleton kind="cards" view={view} count={4} />
            </SectionSkeleton>
          </>
        }
      >
        <AssignmentResults
          classId={id}
          assignmentPage={assignmentPage}
          search={search}
        />
      </Suspense>
    </ListViewProvider>
  );
}
