import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Pencil,
  UserRound,
  Video,
} from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { isSubjectCategory } from '@/lib/choices';
import { formatBytes, formatDate, formatDays, formatTimeRange } from '@/lib/format';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import {
  getClassDetail,
  listClassMaterials,
  listLinkableAssignments,
  type MaterialSummary,
} from '@/lib/study-materials';

import {
  AssignmentLinks,
  DeleteMaterialButton,
  MaterialActionMenu,
} from './material-actions';
import { ModuleToolbar } from './module-toolbar';

function parseClassId(value: string): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : Number.NaN;
}

export async function generateMetadata({
  params,
}: PageProps<'/teacher/module/[classId]'>): Promise<Metadata> {
  const { classId } = await params;
  const id = parseClassId(classId);
  const detail = Number.isNaN(id) ? null : await getClassDetail(id);

  return {
    title: detail
      ? `${detail.name} modules | AfiDu E-Learning`
      : 'Modules | AfiDu E-Learning',
  };
}

const typeIcon = {
  pdf: FileText,
  video: Video,
  write_up: BookOpen,
} as const;

const statusBadge: Record<string, string> = {
  published: 'bg-accent-primary-soft text-accent-primary-strong',
  draft: 'bg-placeholder text-ink-soft',
  archived: 'bg-accent-warm-soft text-accent-warm-strong',
};

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${className}`}
    >
      {children}
    </span>
  );
}

function MaterialBadges({ material }: { material: MaterialSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={statusBadge[material.status] ?? statusBadge.draft}>
        {material.status}
      </Badge>
      <Badge className="bg-shell text-ink-soft">{material.category}</Badge>
      <Badge className="bg-shell text-ink-soft">{material.level}</Badge>
    </div>
  );
}

function MaterialMeta({ material }: { material: MaterialSummary }) {
  return (
    <>
      <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
        <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
        <span className="truncate">
          {material.uploaderName
            ? `Uploaded by ${material.uploaderName}`
            : 'Uploader not recorded'}
        </span>
      </p>
      <p className="mt-1 text-xs break-words text-ink-subtle">
        Added {formatDate(material.uploadedAt)}
        {material.originalFilename ? ` · ${material.originalFilename}` : ''}
        {material.fileSizeBytes ? ` · ${formatBytes(material.fileSizeBytes)}` : ''}
      </p>
    </>
  );
}

function MaterialFileLinks({ material }: { material: MaterialSummary }) {
  if (!material.file) return null;
  const fileHref = `/api/study-materials/${material.id}/file`;

  return (
    <div className="flex flex-wrap gap-3 text-sm font-semibold">
      <a
        href={fileHref}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        Open
      </a>
      <a
        href={`${fileHref}?download=1`}
        className="inline-flex items-center gap-1.5 text-accent-primary hover:underline"
      >
        <Download aria-hidden="true" className="size-4" />
        Download
      </a>
    </div>
  );
}

function MaterialActions({
  material,
  classId,
}: {
  material: MaterialSummary;
  classId: number;
}) {
  return (
    <>
      <Link
        href={`/teacher/module/${classId}/${material.id}/edit`}
        className={buttonVariants({ variant: 'secondary', size: 'sm' })}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>
      <DeleteMaterialButton
        classId={classId}
        materialId={material.id}
        title={material.title}
      />
    </>
  );
}

function MaterialIcon({ material }: { material: MaterialSummary }) {
  const Icon = typeIcon[material.materialType as keyof typeof typeIcon] ?? FileText;

  return (
    <IconTile tone={material.materialType === 'video' ? 'cool' : 'warm'}>
      <Icon aria-hidden="true" strokeWidth={1.8} />
    </IconTile>
  );
}

/** Wide layout: icon, details and actions on one line. */
function MaterialRow({
  material,
  classId,
  assignments,
}: {
  material: MaterialSummary;
  classId: number;
  assignments: Awaited<ReturnType<typeof listLinkableAssignments>>;
}) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <MaterialIcon material={material} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold break-words text-ink-strong">
                  {material.title}
                </p>
                {material.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {material.description}
                  </p>
                ) : null}

                <div className="mt-2">
                  <MaterialBadges material={material} />
                </div>

                <div className="mt-2">
                  <MaterialMeta material={material} />
                </div>

                <div className="mt-2.5">
                  <MaterialFileLinks material={material} />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end">
                <MaterialActions material={material} classId={classId} />
              </div>
            </div>
          </div>
        </div>

        <AssignmentLinks
          classId={classId}
          materialId={material.id}
          linked={material.linkedAssignments}
          options={assignments}
        />
      </CardContent>
    </SurfaceCard>
  );
}

/**
 * Narrow layout: everything stacked, with the title clamped and the actions
 * pushed to the bottom so cards in the same grid row line up.
 */
function MaterialTile({
  material,
  classId,
  assignments,
}: {
  material: MaterialSummary;
  classId: number;
  assignments: Awaited<ReturnType<typeof listLinkableAssignments>>;
}) {
  return (
    <SurfaceCard className="h-full">
      <CardContent className="flex h-full flex-col p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <MaterialIcon material={material} />

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-base font-semibold break-words text-ink-strong">
              {material.title}
            </p>
            <div className="mt-2">
              <MaterialBadges material={material} />
            </div>
          </div>
        </div>

        {material.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-ink-muted">
            {material.description}
          </p>
        ) : null}

        <div className="mt-3">
          <MaterialMeta material={material} />
        </div>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <MaterialFileLinks material={material} />
          <MaterialActionMenu
            classId={classId}
            materialId={material.id}
            title={material.title}
          />
        </div>

        <AssignmentLinks
          classId={classId}
          materialId={material.id}
          linked={material.linkedAssignments}
          options={assignments}
        />
      </CardContent>
    </SurfaceCard>
  );
}

export default async function ClassModulePage({
  params,
  searchParams,
}: PageProps<'/teacher/module/[classId]'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const id = parseClassId((await params).classId);
  if (Number.isNaN(id)) notFound();

  const detail = await getClassDetail(id);
  if (!detail) notFound();

  const urlSearchParams = await searchParams;
  const query = String(urlSearchParams.q ?? '').trim().slice(0, 100);
  const categoryValue = String(urlSearchParams.category ?? '');
  const category = isSubjectCategory(categoryValue) ? categoryValue : undefined;
  const view = urlSearchParams.view === 'grid' ? 'grid' : 'rows';
  const requestedPage = Number(urlSearchParams.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [materialPage, assignments] = await Promise.all([
    listClassMaterials(id, { query, category, page }),
    listLinkableAssignments(id),
  ]);
  const materials = materialPage.items;
  const filtering = Boolean(query || category);

  return (
    <>
      <Link
        href="/teacher/module"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink-strong"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All classes
      </Link>

      <PageHeader
        title={detail.name.toUpperCase()}
        description={`${formatTimeRange(detail.startTime, detail.endTime)} · ${formatDays(
          detail.days,
        )} · ${materialPage.allTotal} module${materialPage.allTotal === 1 ? '' : 's'}`}
        actions={
          <ModuleToolbar
            classId={id}
            query={query}
            category={category}
            view={view}
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
          <SurfaceCard variant="empty">
            <CardContent className="px-5 py-10 sm:px-10 sm:py-14">
              <IconTile className="mx-auto" tone="warm">
                <BookOpen aria-hidden="true" />
              </IconTile>
              <p className="mt-4 text-sm text-ink-muted">
                {filtering
                  ? 'No modules match the current search and category filter.'
                  : 'No modules for this class yet. Add the first one to get started.'}
              </p>
              {filtering ? (
                <Link
                  href={
                    view === 'grid'
                      ? `/teacher/module/${id}?view=grid`
                      : `/teacher/module/${id}`
                  }
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'lg',
                    className: 'mt-4',
                  })}
                >
                  Clear filters
                </Link>
              ) : null}
            </CardContent>
          </SurfaceCard>
        ) : (
          <ul
            className={
              view === 'grid'
                ? 'grid items-stretch gap-3 sm:gap-4 lg:grid-cols-2 2xl:grid-cols-3'
                : 'flex flex-col gap-3 sm:gap-4'
            }
          >
            {materials.map((material) => {
              const Layout = view === 'grid' ? MaterialTile : MaterialRow;
              return (
                <li key={material.id}>
                  <Layout
                    material={material}
                    classId={id}
                    assignments={assignments}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <QueryPagination
          pathname={`/teacher/module/${id}`}
          page={materialPage.page}
          totalPages={materialPage.totalPages}
          query={{ q: query || undefined, category, view: view === 'grid' ? view : undefined }}
        />
      </section>
    </>
  );
}
