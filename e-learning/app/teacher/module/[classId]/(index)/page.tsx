import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';

import { BackLink } from '@/components/dashboard/back-link';
import {
  ClientList,
  ListViewLink,
  ListViewProvider,
} from '@/components/dashboard/client-list-view';
import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { buttonVariants } from '@/components/ui/button';
import { isMaterialStatus, isSubjectCategory } from '@/lib/choices';
import { formatClassSchedule, pluralize } from '@/lib/format';
import { parseListView } from '@/lib/list-view';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import {
  getClassDetail,
  listClassMaterials,
  listLinkableAssignments,
} from '@/lib/study-materials';

import { MaterialCard } from '../material-card';
import { ModuleToolbar } from '../module-toolbar';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/module/[classId]'>): Promise<Metadata> {
  const { classId } = await params;
  const id = parseRouteId(classId);
  const detail = Number.isNaN(id) ? null : await getClassDetail(id);

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

export default async function ClassModulePage({
  params,
  searchParams,
}: PageProps<'/teacher/module/[classId]'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const id = parseRouteId((await params).classId);
  if (Number.isNaN(id)) notFound();

  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const { query, category, status, view, page } = readSearchParams(await searchParams);
  const [materialPage, assignments] = await Promise.all([
    listClassMaterials(id, { query, category, status, page }),
    listLinkableAssignments(id),
  ]);
  const materials = materialPage.items;
  const filtering = Boolean(query || category || status);
  return (
    <ListViewProvider initialView={view}>
      <BackLink href="/teacher/module">All classes</BackLink>

      <PageHeader
        title={detail.name.toUpperCase()}
        description={`${formatClassSchedule(detail)} · ${pluralize(
          materialPage.allTotal,
          'module',
        )}`}
        actions={
          <ModuleToolbar
            classId={id}
            query={query}
            category={category}
            status={status}
          />
        }
      />

      <section aria-labelledby="materials-heading">
        <h2
          id="materials-heading"
          className="mb-3 text-lg font-bold tracking-tight text-ink sm:mb-4 sm:text-xl"
        >
          Modules{filtering ? ` (${materialPage.total} found)` : ''}
        </h2>

        {materials.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            tone="warm"
            action={
              filtering ? (
                <ListViewLink
                  href={`/teacher/module/${id}`}
                  className={buttonVariants({ variant: 'outline', size: 'lg' })}
                >
                  Clear filters
                </ListViewLink>
              ) : null
            }
          >
            {filtering
              ? 'No modules match the current search and filters.'
              : 'No modules for this class yet. Add the first one to get started.'}
          </EmptyState>
        ) : (
          <ClientList>
            {materials.map((material) => (
              <li key={material.id}>
                <MaterialCard
                  material={material}
                  classId={id}
                  assignments={assignments}
                />
              </li>
            ))}
          </ClientList>
        )}

        <QueryPagination
          pathname={`/teacher/module/${id}`}
          page={materialPage.page}
          totalPages={materialPage.totalPages}
          query={{
            q: query || undefined,
            category,
            status,
          }}
        />
      </section>
    </ListViewProvider>
  );
}
