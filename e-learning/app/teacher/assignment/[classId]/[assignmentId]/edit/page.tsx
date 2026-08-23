import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getEditableAssignment, listClassMaterialOptions } from '@/lib/assignments';
import { getClassDetail } from '@/lib/study-materials';

import { AssignmentForm } from '../../new/assignment-form';

export async function generateMetadata({
  params,
}: PageProps<'/teacher/assignment/[classId]/[assignmentId]/edit'>): Promise<Metadata> {
  const { classId, assignmentId } = await params;
  const classIdNumber = parseRouteId(classId);
  const assignmentIdNumber = parseRouteId(assignmentId);
  const item =
    Number.isNaN(classIdNumber) || Number.isNaN(assignmentIdNumber)
      ? null
      : await getEditableAssignment(classIdNumber, assignmentIdNumber);

  return {
    title: item
      ? `Edit ${item.title} | AfiDu E-Learning`
      : 'Edit assignment | AfiDu E-Learning',
  };
}

export default async function EditAssignmentPage({
  params,
}: PageProps<'/teacher/assignment/[classId]/[assignmentId]/edit'>) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const { classId, assignmentId } = await params;
  const classIdNumber = parseRouteId(classId);
  const assignmentIdNumber = parseRouteId(assignmentId);
  if (Number.isNaN(classIdNumber) || Number.isNaN(assignmentIdNumber)) notFound();

  const [detail, item, materials] = await Promise.all([
    getClassDetail(classIdNumber),
    getEditableAssignment(classIdNumber, assignmentIdNumber),
    listClassMaterialOptions(classIdNumber),
  ]);
  if (!detail || !item) notFound();

  return (
    <>
      <BackLink href={`/teacher/assignment/${classIdNumber}/${assignmentIdNumber}`}>
        Back to submissions
      </BackLink>

      <PageHeader
        title="EDIT ASSIGNMENT"
        description={`${item.title} · ${detail.name}`}
      />

      <AssignmentForm
        classId={classIdNumber}
        suggestedLevel={detail.suggestedLevel}
        materials={materials}
        initialAssignment={item}
      />
    </>
  );
}
