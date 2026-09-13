import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { formatDays, formatTimeRange } from '@/lib/format';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listScoreConfigs } from '@/lib/score-config-data';
import { listClassMaterialOptions } from '@/lib/assignments';
import { isB2Configured } from '@/lib/b2';
import { getClassDetailBySlug } from '@/lib/study-materials';

import { AssignmentForm } from './assignment-form';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/assignment/[classId]/new'>): Promise<Metadata> {
  const classSlug = (await params).classId;
  const detail = await getClassDetailBySlug(classSlug);
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

  const classSlug = (await params).classId;
  const detail = await getClassDetailBySlug(classSlug);
  if (!detail) notFound();

  const [materials, scoreConfigs] = await Promise.all([
    listClassMaterialOptions(detail.id),
    listScoreConfigs(),
  ]);

  return (
    <>
      <BackLink href={`/teacher/assignment/${classSlug}`}>
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
        classId={detail.id}
        classSlug={classSlug}
        suggestedLevel={detail.suggestedLevel}
        materials={materials}
        scoreConfigs={scoreConfigs}
        storageReady={isB2Configured()}
      />
    </>
  );
}
