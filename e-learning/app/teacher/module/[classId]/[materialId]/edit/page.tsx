import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { UnsavedChangesProvider } from '@/components/form/unsaved-changes';
import { isB2Configured } from '@/lib/b2';
import { parseRouteId } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getClassDetail, getEditableMaterial } from '@/lib/study-materials';

import { ModuleForm } from '../../upload/upload-form';

type EditModulePageProps = {
  params: Promise<{ classId: string; materialId: string }>;
};

export async function generateMetadata({
  params,
}: EditModulePageProps): Promise<Metadata> {
  const { classId, materialId } = await params;
  const classIdNumber = parseRouteId(classId);
  const materialIdNumber = parseRouteId(materialId);
  const material =
    Number.isNaN(classIdNumber) || Number.isNaN(materialIdNumber)
      ? null
      : await getEditableMaterial(classIdNumber, materialIdNumber);

  return {
    title: material
      ? `Edit ${material.title} | AfiDu E-Learning`
      : 'Edit module | AfiDu E-Learning',
  };
}

export default async function EditModulePage({
  params,
}: EditModulePageProps) {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  const { classId, materialId } = await params;
  const classIdNumber = parseRouteId(classId);
  const materialIdNumber = parseRouteId(materialId);
  if (Number.isNaN(classIdNumber) || Number.isNaN(materialIdNumber)) notFound();

  const [detail, material] = await Promise.all([
    getClassDetail(classIdNumber),
    getEditableMaterial(classIdNumber, materialIdNumber),
  ]);
  if (!detail || !material) notFound();

  return (
    <UnsavedChangesProvider>
      <BackLink href={`/teacher/module/${classIdNumber}`}>
        Back to modules
      </BackLink>

      <PageHeader
        title="EDIT MODULE"
        description={`${material.title} · ${detail.name}`}
      />

      <div className="w-full">
        <ModuleForm
          classId={classIdNumber}
          suggestedLevel={detail.suggestedLevel}
          storageReady={isB2Configured()}
          initialMaterial={material}
        />
      </div>
    </UnsavedChangesProvider>
  );
}
