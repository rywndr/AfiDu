import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
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
import { isMaterialStatus, isSubjectCategory } from '@/lib/choices';
import { formatClassSchedule, pluralize } from '@/lib/format';
import { parseListView } from '@/lib/list-view';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import {
  getClassDetailBySlug,
  listClassMaterials,
  listLinkableAssignments,
} from '@/lib/study-materials';

import { MaterialCard } from '../material-card';
import { ModuleToolbar } from '../module-toolbar';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/module/[classId]'>): Promise<Metadata> {
  const { classId: classSlug } = await params;
  const detail = await getClassDetailBySlug(classSlug);

  return {
    title: detail
      ? `${detail.name} modules | AfiDu E-Learning`
      : 'Modules | AfiDu E-Learning',
  };
}

/** The search, filter and view state the page is rendered for. */
function readSearchParams(params: Awaited<PageProps<'/teacher/module/[classId]'>['searchParams']>) {
  const categoryValue = String(params.category ?? '');
  const statusValue = String(params.status ?? '');
  const requestedPage = Number(params.page ?? 1);

  return {
    query: String(params.q ?? '').trim().slice(0, 100),
    category: isSubjectCategory(categoryValue) ? categoryValue : undefined,
    status: isMaterialStatus(statusValue) ? statusValue : undefined,
    view: parseListView(params.view),
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
  };
}

type ModuleSearch = ReturnType<typeof readSearchParams>;
type MaterialPagePromise = ReturnType<typeof listClassMaterials>;
type AssignmentsPromise = ReturnType<typeof listLinkableAssignments>;

async function ModuleDescription({
  detail,
  materialPage,
}: {
  detail: NonNullable<Awaited<ReturnType<typeof getClassDetailBySlug>>>;
  materialPage: MaterialPagePromise;
}) {
  const result = await materialPage;

  return `${formatClassSchedule(detail)} · ${pluralize(result.allTotal, 'module')}`;
}

async function ModuleResults({
  classSlug,
  classId,
  materialPage,
  assignments,
  search,
}: {
  classSlug: string;
  classId: number;
  materialPage: MaterialPagePromise;
  assignments: AssignmentsPromise;
  search: ModuleSearch;
}) {
  const [result, linkableAssignments] = await Promise.all([
    materialPage,
    assignments,
  ]);
  const materials = result.items;
  const { query, category, status } = search;
  const filtering = Boolean(query || category || status);

  return (
    <section aria-labelledby="materials-heading">
      <h2
        id="materials-heading"
        className="mb-3 text-lg font-bold tracking-tight text-ink sm:mb-4 sm:text-xl"
      >
        Modules{filtering ? ` (${result.total} found)` : ''}
      </h2>

      {materials.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          tone="warm"
          action={
            filtering ? (
              <ListViewLink
                href={`/teacher/module/${classSlug}`}
                className={buttonVariants({ variant: 'outline', size: 'lg' })}
              >
                Clear filters
              </ListViewLink>
            ) : (
              <Link
                href={`/teacher/module/${classSlug}/upload`}
                className={buttonVariants({ size: 'lg' })}
              >
                Add module
              </Link>
            )
          }
        >
          {filtering
            ? 'No modules match the current search and filters.'
            : 'No modules for this class yet.'}
        </EmptyState>
      ) : (
        <ClientList>
          {materials.map((material) => (
            <li key={material.id}>
              <MaterialCard
                material={material}
                classId={classId}
                classSlug={classSlug}
                assignments={linkableAssignments}
              />
            </li>
          ))}
        </ClientList>
      )}

      <QueryPagination
        pathname={`/teacher/module/${classSlug}`}
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

export default async function ClassModulePage({
  params,
  searchParams,
}: PageProps<'/teacher/module/[classId]'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const classSlug = (await params).classId;
  const detail = await getClassDetailBySlug(classSlug);
  if (!detail) notFound();

  const search = readSearchParams(await searchParams);
  const { query, category, status, view, page } = search;
  const materialPage = listClassMaterials(detail.id, { query, category, status, page });
  const assignments = listLinkableAssignments(detail.id);
  const resultsKey = [query, category, status, page].join(':');

  return (
    <ListViewProvider initialView={view}>
      <BackLink href="/teacher/module">All classes</BackLink>

      <PageHeader
        title={detail.name.toUpperCase()}
        description={
          <Suspense fallback={formatClassSchedule(detail)}>
            <ModuleDescription detail={detail} materialPage={materialPage} />
          </Suspense>
        }
        actions={
          <ModuleToolbar
            classSlug={classSlug}
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
              Loading modules
            </span>
            <SectionSkeleton description={false}>
              <ListSkeleton kind="cards" view={view} count={4} />
            </SectionSkeleton>
          </>
        }
      >
        <ModuleResults
          classSlug={classSlug}
          classId={detail.id}
          materialPage={materialPage}
          assignments={assignments}
          search={search}
        />
      </Suspense>
    </ListViewProvider>
  );
}
