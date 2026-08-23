import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BookOpen,
  CalendarClock,
  CircleCheck,
  ClipboardCheck,
  Hourglass,
  ListChecks,
  Pencil,
  Repeat,
  Timer,
  Users,
} from 'lucide-react';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { QueryPagination } from '@/components/dashboard/query-pagination';
import { SurfaceCard } from '@/components/dashboard/surfaces';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';
import {
  isAssignmentStatus,
  isSubjectCategory,
  statusBadgeClass,
} from '@/lib/choices';
import {
  formatClassSchedule,
  formatDateTime,
  formatScore,
  pluralize,
} from '@/lib/format';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listClassAssignments, type AssignmentSummary } from '@/lib/assignments';
import { getClassDetail } from '@/lib/study-materials';
import { cn } from '@/lib/utils';

import { AssignmentActionMenu } from './assignment-actions';
import { AssignmentToolbar } from './assignment-toolbar';

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

function AssignmentBadges({ item }: { item: AssignmentSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge className={cn('capitalize', statusBadgeClass(item.status))}>
        {item.status}
      </Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{item.category}</Badge>
      <Badge className="bg-shell text-ink-soft capitalize">{item.level}</Badge>
    </div>
  );
}

function AssignmentMeta({ item }: { item: AssignmentSummary }) {
  return (
    <div className="mt-2 flex flex-col gap-1 text-xs text-ink-subtle">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <CalendarClock aria-hidden="true" className="size-3.5 shrink-0" />
          {item.dueAt ? `Due ${formatDateTime(item.dueAt)}` : 'No due date'}
          {item.dueAt && item.allowLate ? ' · late allowed' : ''}
        </span>
        {item.openAt ? (
          <span className="flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-3.5 shrink-0" />
            Opens {formatDateTime(item.openAt)}
          </span>
        ) : null}
      </p>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <ListChecks aria-hidden="true" className="size-3.5 shrink-0" />
          {item.questionCount} question{item.questionCount === 1 ? '' : 's'} ·{' '}
          {formatScore(item.maxPoints)} point
          {formatScore(item.maxPoints) === '1' ? '' : 's'}
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat aria-hidden="true" className="size-3.5 shrink-0" />
          {item.maxAttempts} attempt{item.maxAttempts === 1 ? '' : 's'}
        </span>
        {item.timeLimitMinutes ? (
          <span className="flex items-center gap-1.5">
            <Timer aria-hidden="true" className="size-3.5 shrink-0" />
            {item.timeLimitMinutes} min limit
          </span>
        ) : null}
      </p>
      {item.materialId && item.materialTitle ? (
        <p className="flex items-center gap-1.5">
          <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">Reads {item.materialTitle}</span>
        </p>
      ) : null}
    </div>
  );
}

function SubmissionCounts({ item }: { item: AssignmentSummary }) {
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-soft">
      <span className="flex items-center gap-1.5">
        <Users aria-hidden="true" className="size-3.5" />
        {item.submissionCount} submission{item.submissionCount === 1 ? '' : 's'}
      </span>
      {item.awaitingGradingCount > 0 ? (
        <span className="flex items-center gap-1.5 text-accent-warm-strong">
          <Hourglass aria-hidden="true" className="size-3.5" />
          {item.awaitingGradingCount} to mark
        </span>
      ) : null}
      {item.gradedCount > 0 ? (
        <span className="flex items-center gap-1.5 text-accent-primary">
          <CircleCheck aria-hidden="true" className="size-3.5" />
          {item.gradedCount} marked
        </span>
      ) : null}
    </p>
  );
}

function AssignmentCard({
  item,
  classId,
}: {
  item: AssignmentSummary;
  classId: number;
}) {
  return (
    <SurfaceCard>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3.5 sm:gap-4">
          <IconTile tone={item.awaitingGradingCount > 0 ? 'warm' : 'cool'}>
            <ClipboardCheck aria-hidden="true" strokeWidth={1.8} />
          </IconTile>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/teacher/assignment/${classId}/${item.id}`}
                  className="text-base font-semibold break-words text-ink-strong hover:underline"
                >
                  {item.title}
                </Link>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-muted">
                    {item.description}
                  </p>
                ) : null}

                <div className="mt-2">
                  <AssignmentBadges item={item} />
                </div>

                <AssignmentMeta item={item} />
                <SubmissionCounts item={item} />
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-2 sm:justify-end">
                <Link
                  href={`/teacher/assignment/${classId}/${item.id}`}
                  className={buttonVariants({ variant: 'secondary', size: 'sm' })}
                >
                  <Users aria-hidden="true" />
                  Submissions
                </Link>
                <Link
                  href={`/teacher/assignment/${classId}/${item.id}/edit`}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Link>
                <AssignmentActionMenu
                  classId={classId}
                  assignmentId={item.id}
                  title={item.title}
                  submissionCount={item.submissionCount}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </SurfaceCard>
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

  const urlSearchParams = await searchParams;
  const query = String(urlSearchParams.q ?? '').trim().slice(0, 100);
  const categoryValue = String(urlSearchParams.category ?? '');
  const category = isSubjectCategory(categoryValue) ? categoryValue : undefined;
  const statusValue = String(urlSearchParams.status ?? '');
  const status = isAssignmentStatus(statusValue) ? statusValue : undefined;
  const requestedPage = Number(urlSearchParams.page ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const assignmentPage = await listClassAssignments(id, {
    query,
    category,
    status,
    page,
  });
  const assignments = assignmentPage.items;
  const filtering = Boolean(query || category || status);

  return (
    <>
      <BackLink href="/teacher/assignment">
        All classes
      </BackLink>

      <PageHeader
        title={detail.name.toUpperCase()}
        description={`${formatClassSchedule(detail)} · ${pluralize(
          assignmentPage.allTotal,
          'assignment',
        )}`}
        actions={
          <AssignmentToolbar
            classId={id}
            query={query}
            category={category}
            status={status}
          />
        }
      />

      <section aria-labelledby="assignments-heading">
        <h2
          id="assignments-heading"
          className="mb-3 text-lg font-bold tracking-tight text-ink sm:mb-4 sm:text-xl"
        >
          Assignments{filtering ? ` (${assignmentPage.total} found)` : ''}
        </h2>

        {assignments.length === 0 ? (
          <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
            <EmptyHeader>
              <EmptyMedia>
                <IconTile>
                  <ClipboardCheck aria-hidden="true" />
                </IconTile>
              </EmptyMedia>
              <EmptyDescription>
                {filtering
                  ? 'No assignments match the current search and filters.'
                  : 'No assignments for this class yet. Create the first one to get started.'}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Link
                href={
                  filtering
                    ? `/teacher/assignment/${id}`
                    : `/teacher/assignment/${id}/new`
                }
                className={buttonVariants({
                  variant: filtering ? 'outline' : 'default',
                  size: 'lg',
                })}
              >
                {filtering ? 'Clear filters' : 'New assignment'}
              </Link>
            </EmptyContent>
          </Empty>
        ) : (
          <ul className="flex flex-col gap-3 sm:gap-4">
            {assignments.map((item) => (
              <li key={item.id}>
                <AssignmentCard item={item} classId={id} />
              </li>
            ))}
          </ul>
        )}

        <QueryPagination
          pathname={`/teacher/assignment/${id}`}
          page={assignmentPage.page}
          totalPages={assignmentPage.totalPages}
          query={{ q: query || undefined, category, status }}
        />
      </section>
    </>
  );
}
