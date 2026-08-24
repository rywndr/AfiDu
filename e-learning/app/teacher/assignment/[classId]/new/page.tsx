import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { formatDays, formatTimeRange } from '@/lib/format';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listClassMaterialOptions } from '@/lib/assignments';
import { isB2Configured } from '@/lib/b2';
import { getClassDetail } from '@/lib/study-materials';

import { AssignmentForm } from './assignment-form';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/assignment/[classId]/new'>): Promise<Metadata> {
  const id = parseRouteId((await params).classId);
  const detail = Number.isNaN(id) ? null : await getClassDetail(id);
  return {
    title: detail
      ? `New assignment for ${detail.name} | AfiDu E-Learning`
      : 'New assignment | AfiDu E-Learning',
  };
}

export default async function NewAssignmentPage({
  params,
}: PageProps<'/teacher/assignment/[classId]/new'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const id = parseRouteId((await params).classId);
  if (Number.isNaN(id)) notFound();

  const [detail, materials] = await Promise.all([
    getClassDetail(id),
    listClassMaterialOptions(id),
  ]);
  if (!detail) notFound();

  return (
    <>
      <BackLink href={`/teacher/assignment/${id}`}>
        Back to assignments
      </BackLink>

      <PageHeader
        title="NEW ASSIGNMENT"
        description={`${detail.name} · ${formatTimeRange(
          detail.startTime,
          detail.endTime,
        )} · ${formatDays(detail.days)}`}
      />

      <AssignmentForm
        classId={id}
        suggestedLevel={detail.suggestedLevel}
        materials={materials}
        storageReady={isB2Configured()}
      />
    </>
  );
}
