import type { Metadata } from 'next';
import { BookOpen, GraduationCap } from 'lucide-react';

import {
  ClientList,
  ListViewLink,
  ListViewProvider,
} from '@/components/dashboard/client-list-view';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
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

  const { query, category, materialType, view, page } = readSearchParams(
    await searchParams,
  );
  const materialPage = await listStudentMaterials({
    classId: profile.classId,
    query,
    category,
    materialType,
    page,
  });
  const materials = materialPage.items;
  const filtering = Boolean(query || category || materialType);
  const description =
    materialPage.allTotal === 0
      ? `Shared with ${profile.className}.`
      : `${pluralize(materialPage.allTotal, 'module')} for ${profile.className}` +
        (filtering ? ` · ${materialPage.total} found` : '');

  return (
    <ListViewProvider initialView={view}>
      <PageHeader
        title="MODULE"
        description={description}
        actions={
          materialPage.allTotal > 0 ? (
            <StudentModuleToolbar
              query={query}
              category={category}
              materialType={materialType}
            />
          ) : null
        }
      />

      {materials.length === 0 ? (
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
              When your teacher publishes a module for {profile.className} it turns
              up here to read, watch or download.
            </>
          )}
        </EmptyState>
      ) : (
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
            page={materialPage.page}
            totalPages={materialPage.totalPages}
            query={{
              q: query || undefined,
              category,
              type: materialType,
            }}
          />
        </>
      )}
    </ListViewProvider>
  );
}
