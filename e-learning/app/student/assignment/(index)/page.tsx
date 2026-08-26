import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardCheck, GraduationCap } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { buttonVariants } from '@/components/ui/button';
import { isSubjectCategory, isSubmissionRowStatus } from '@/lib/choices';
import { pluralize } from '@/lib/format';
import { parsePageNumber, parseSearchQuery } from '@/lib/list-query';
import { listViewClass, parseListView } from '@/lib/list-view';
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

  const { query, category, status, view, page } = readSearchParams(await searchParams);
  const assignmentPage = await listStudentAssignments({
    studentId: profile.id,
    classId: profile.classId,
    query,
    category,
    status,
    page,
  });
  const assignments = assignmentPage.items;
  const filtering = Boolean(query || category || status);
  // clearing the filters keeps whichever layout the student is looking at
  const clearFiltersHref =
    view === 'grid' ? '/student/assignment?view=grid' : '/student/assignment';
  const description =
    assignmentPage.allTotal === 0
      ? `Set for ${profile.className}.`
      : [
          `${pluralize(assignmentPage.allTotal, 'assignment')} for ${profile.className}`,
          assignmentPage.outstanding > 0
            ? `${assignmentPage.outstanding} still to do`
            : 'all handed in',
          ...(filtering ? [`${assignmentPage.total} found`] : []),
        ].join(' · ');

  return (
    <>
      <PageHeader
        title="ASSESSMENTS"
        description={description}
        actions={
          assignmentPage.allTotal > 0 ? (
            <StudentAssignmentToolbar
              query={query}
              category={category}
              status={status}
              view={view}
            />
          ) : null
        }
      />

      {assignments.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={filtering ? 'No matches' : 'Nothing set yet'}
          action={
            filtering ? (
              <Link
                href={clearFiltersHref}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Clear filters
              </Link>
            ) : null
          }
        >
          {filtering ? (
            'No assignments match the current search and filters.'
          ) : (
            <>
              When your teacher publishes an assignment for {profile.className} it
              shows up here.
            </>
          )}
        </EmptyState>
      ) : (
        <>
          <ul className={listViewClass(view)}>
            {assignments.map((item) => (
              <li key={item.id}>
                <StudentAssignmentCard item={item} />
              </li>
            ))}
          </ul>

          <QueryPagination
            pathname="/student/assignment"
            page={assignmentPage.page}
            totalPages={assignmentPage.totalPages}
            query={{
              q: query || undefined,
              category,
              status,
              view: view === 'grid' ? view : undefined,
            }}
          />
        </>
      )}
    </>
  );
}
