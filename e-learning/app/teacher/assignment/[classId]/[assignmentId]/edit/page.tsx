import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { UnsavedChangesProvider } from '@/components/form/unsaved-changes';
import { parseRouteUuid } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listScoreConfigs } from '@/lib/score-config-data';
import { getEditableAssignment, listClassMaterialOptions } from '@/lib/assignments';
import { isB2Configured } from '@/lib/b2';
import { getClassDetailBySlug } from '@/lib/study-materials';

import { AssignmentForm } from '../../new/assignment-form';

type EditAssignmentPageProps = {
  params: Promise<{
    classId: string;
    assignmentId: string;
  }>;
};

export async function generateMetadata({
  params,
}: EditAssignmentPageProps): Promise<Metadata> {
  const { classId, assignmentId } = await params;
  const assignmentPublicId = parseRouteUuid(assignmentId);
  const detail = await getClassDetailBySlug(classId);
  const item =
    !detail || assignmentPublicId === null
      ? null
      : await getEditableAssignment(detail.id, assignmentPublicId);

  return {
    title: item
      ? `Edit ${item.title} | AfiDu E-Learning`
      : 'Edit assignment | AfiDu E-Learning',
  };
}

export default async function EditAssignmentPage({
  params,
}: EditAssignmentPageProps) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const { classId, assignmentId } = await params;
  const assignmentPublicId = parseRouteUuid(assignmentId);
  if (assignmentPublicId === null) notFound();

  const detail = await getClassDetailBySlug(classId);
  if (!detail) notFound();

  const [item, materials, scoreConfigs] = await Promise.all([
    getEditableAssignment(detail.id, assignmentPublicId),
    listClassMaterialOptions(detail.id),
    listScoreConfigs(),
  ]);
  if (!item) notFound();

  return (
    <UnsavedChangesProvider>
      <BackLink href={`/teacher/assignment/${classId}/${assignmentPublicId}`}>
        Back to submissions
      </BackLink>

      <PageHeader
        title="EDIT ASSIGNMENT"
        description={`${item.title} · ${detail.name}`}
      />

      <AssignmentForm
        classId={detail.id}
        classSlug={classId}
        suggestedLevel={detail.suggestedLevel}
        materials={materials}
        scoreConfigs={scoreConfigs}
        storageReady={isB2Configured()}
        initialAssignment={item}
      />
    </UnsavedChangesProvider>
  );
}
