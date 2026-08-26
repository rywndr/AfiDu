import type { Metadata } from 'next';
import { BookOpen, GraduationCap } from 'lucide-react';
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
import { isMaterialType, isSubjectCategory } from '@/lib/choices';
import { pluralize } from '@/lib/format';
import { parsePageNumber, parseSearchQuery } from '@/lib/list-query';
import { parseListView } from '@/lib/list-view';
import { requireStudentProfile } from '@/lib/student-access';
import { listStudentMaterials } from '@/lib/student-materials';

import { StudentModuleCard } from '../module-card';
import { StudentModuleToolbar } from '../module-toolbar';

export const metadata: Metadata = {
  title: 'Modules | AfiDu E-Learning',
};

/** Reads the search, filter and view state out of the URL. */
function readSearchParams(
  params: Awaited<PageProps<'/student/module'>['searchParams']>,
) {
  const categoryValue = String(params.category ?? '');
  const typeValue = String(params.type ?? '');

  return {
    query: parseSearchQuery(params.q),
    category: isSubjectCategory(categoryValue) ? categoryValue : undefined,
    materialType: isMaterialType(typeValue) ? typeValue : undefined,
    view: parseListView(params.view),
    page: parsePageNumber(params.page),
  };
}

type ModuleSearch = ReturnType<typeof readSearchParams>;
type MaterialPagePromise = ReturnType<typeof listStudentMaterials>;

async function ModuleDescription({
  materialPage,
  className,
  filtering,
}: {
  materialPage: MaterialPagePromise;
  className: string | null;
  filtering: boolean;
}) {
  const result = await materialPage;

  return result.allTotal === 0
    ? `Shared with ${className}.`
    : `${pluralize(result.allTotal, 'module')} for ${className}` +
        (filtering ? ` · ${result.total} found` : '');
}

async function ModuleResults({
  materialPage,
  className,
  search,
}: {
  materialPage: MaterialPagePromise;
  className: string | null;
  search: ModuleSearch;
}) {
  const result = await materialPage;
  const materials = result.items;
  const { query, category, materialType } = search;
  const filtering = Boolean(query || category || materialType);

  if (materials.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={filtering ? 'No matches' : 'Nothing shared yet'}
        action={
          filtering ? (
            <ListViewLink
              href="/student/module"
              className={buttonVariants({ variant: 'outline', size: 'lg' })}
            >
              Clear filters
            </ListViewLink>
          ) : null
        }
      >
        {filtering ? (
          'No modules match the current search and filters.'
        ) : (
          <>
            When your teacher publishes a module for {className} it turns up here
            to read, watch or download.
          </>
        )}
      </EmptyState>
    );
  }

  return (
    <>
      <ClientList>
        {materials.map((material) => (
          <li key={material.id}>
            <StudentModuleCard material={material} />
          </li>
        ))}
      </ClientList>

      <QueryPagination
        pathname="/student/module"
        page={result.page}
        totalPages={result.totalPages}
        query={{
          q: query || undefined,
          category,
          type: materialType,
        }}
      />
    </>
  );
}

export default async function StudentModulePage({
  searchParams,
}: PageProps<'/student/module'>) {
  const profile = await requireStudentProfile();

  if (!profile || profile.classId === null) {
    return (
      <>
        <PageHeader
          title="MODULE"
          description="Your learning materials appear here."
        />
        <EmptyState icon={GraduationCap} title="No class yet">
          You are not in a class at the moment, so no modules are shared with you.
        </EmptyState>
      </>
    );
  }

  const search = readSearchParams(await searchParams);
  const { query, category, materialType, view, page } = search;
  const materialPage = listStudentMaterials({
    classId: profile.classId,
    query,
    category,
    materialType,
    page,
  });
  const filtering = Boolean(query || category || materialType);
  const resultsKey = [query, category, materialType, page].join(':');

  return (
    <ListViewProvider initialView={view}>
      <PageHeader
        title="MODULE"
        description={
          <Suspense fallback={`Modules for ${profile.className}.`}>
            <ModuleDescription
              materialPage={materialPage}
              className={profile.className}
              filtering={filtering}
            />
          </Suspense>
        }
        actions={
          <StudentModuleToolbar
            query={query}
            category={category}
            materialType={materialType}
          />
        }
      />

      <Suspense
        key={resultsKey}
        fallback={
          <>
            <span role="status" className="sr-only">
              Loading modules
            </span>
            <ListSkeleton kind="cards" view={view} count={4} />
          </>
        }
      >
        <ModuleResults
          materialPage={materialPage}
          className={profile.className}
          search={search}
        />
      </Suspense>
    </ListViewProvider>
  );
}
