import type { Metadata } from 'next';
import { ClipboardCheck, GraduationCap } from 'lucide-react';
import { Suspense } from 'react';

import {
  ClientList,
  ListViewLink,
  ListViewProvider,
} from '@/components/dashboard/client-list-view';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { ListSkeleton } from '@/components/dashboard/skeletons';
import { buttonVariants } from '@/components/ui/button';
import { isSubjectCategory, isSubmissionRowStatus } from '@/lib/choices';
import { pluralize } from '@/lib/format';
import { parsePageNumber, parseSearchQuery } from '@/lib/list-query';
import { parseListView } from '@/lib/list-view';
import { requireStudentProfile } from '@/lib/student-access';
import { listStudentAssignments } from '@/lib/student-assignments';

import { StudentAssignmentCard } from '../assignment-card';
import { StudentAssignmentToolbar } from '../assignment-toolbar';

export const metadata: Metadata = {
  title: 'Assignments | AfiDu E-Learning',
};

/** Reads the search, filter and view state out of the URL. */
function readSearchParams(
  params: Awaited<PageProps<'/student/assignment'>['searchParams']>,
) {
  const categoryValue = String(params.category ?? '');
  const statusValue = String(params.status ?? '');

  return {
    query: parseSearchQuery(params.q),
    category: isSubjectCategory(categoryValue) ? categoryValue : undefined,
    status: isSubmissionRowStatus(statusValue) ? statusValue : undefined,
    view: parseListView(params.view),
    page: parsePageNumber(params.page),
  };
}

type AssignmentSearch = ReturnType<typeof readSearchParams>;
type AssignmentPagePromise = ReturnType<typeof listStudentAssignments>;

async function AssignmentDescription({
  assignmentPage,
  className,
  filtering,
}: {
  assignmentPage: AssignmentPagePromise;
  className: string | null;
  filtering: boolean;
}) {
  const result = await assignmentPage;

  return result.allTotal === 0
    ? `Set for ${className}.`
    : [
        `${pluralize(result.allTotal, 'assignment')} for ${className}`,
        result.outstanding > 0 ? `${result.outstanding} still to do` : 'all handed in',
        ...(filtering ? [`${result.total} found`] : []),
      ].join(' · ');
}

async function AssignmentResults({
  assignmentPage,
  className,
  search,
}: {
  assignmentPage: AssignmentPagePromise;
  className: string | null;
  search: AssignmentSearch;
}) {
  const result = await assignmentPage;
  const assignments = result.items;
  const { query, category, status } = search;
  const filtering = Boolean(query || category || status);

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={filtering ? 'No matches' : 'Nothing set yet'}
        action={
          filtering ? (
            <ListViewLink
              href="/student/assignment"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              Clear filters
            </ListViewLink>
          ) : null
        }
      >
        {filtering ? (
          'No assignments match the current search and filters.'
        ) : (
          <>
            When your teacher publishes an assignment for {className} it shows up
            here.
          </>
        )}
      </EmptyState>
    );
  }

  return (
    <>
      <ClientList>
        {assignments.map((item) => (
          <li key={item.id}>
            <StudentAssignmentCard item={item} />
          </li>
        ))}
      </ClientList>

      <QueryPagination
        pathname="/student/assignment"
        page={result.page}
        totalPages={result.totalPages}
        query={{
          q: query || undefined,
          category,
          status,
        }}
      />
    </>
  );
}

export default async function StudentAssignmentPage({
  searchParams,
}: PageProps<'/student/assignment'>) {
  const profile = await requireStudentProfile();

  if (!profile || profile.classId === null) {
    return (
      <>
        <PageHeader
          title="ASSESSMENTS"
          description="Your assignments and quizzes appear here."
        />
        <EmptyState icon={GraduationCap} title="No class yet">
          You are not in a class at the moment, so there is nothing set for you.
          Your teacher assigns classes in the AfiDu office app.
        </EmptyState>
      </>
    );
  }

  const search = readSearchParams(await searchParams);
  const { query, category, status, view, page } = search;
  const assignmentPage = listStudentAssignments({
    studentId: profile.id,
    classId: profile.classId,
    query,
    category,
    status,
    page,
  });
  const filtering = Boolean(query || category || status);
  const resultsKey = [query, category, status, page].join(':');

  return (
    <ListViewProvider initialView={view}>
      <PageHeader
        title="ASSESSMENTS"
        description={
          <Suspense fallback={`Assignments for ${profile.className}.`}>
            <AssignmentDescription
              assignmentPage={assignmentPage}
              className={profile.className}
              filtering={filtering}
            />
          </Suspense>
        }
        actions={
          <StudentAssignmentToolbar
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
            <ListSkeleton kind="cards" view={view} count={4} />
          </>
        }
      >
        <AssignmentResults
          assignmentPage={assignmentPage}
          className={profile.className}
          search={search}
        />
      </Suspense>
    </ListViewProvider>
  );
}
