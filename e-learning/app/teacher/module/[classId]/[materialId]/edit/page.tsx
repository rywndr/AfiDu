import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { UnsavedChangesProvider } from '@/components/form/unsaved-changes';
import { isB2Configured } from '@/lib/b2';
import { parseRouteUuid } from '@/lib/route-params';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { getClassDetailBySlug, getEditableMaterial } from '@/lib/study-materials';

import { ModuleForm } from '../../upload/upload-form';

type EditModulePageProps = {
  params: Promise<{ classId: string; materialId: string }>;
};

export async function generateMetadata({
  params,
}: EditModulePageProps): Promise<Metadata> {
  const { classId, materialId } = await params;
  const materialPublicId = parseRouteUuid(materialId);
  const detail = await getClassDetailBySlug(classId);
  const material =
    !detail || materialPublicId === null
      ? null
      : await getEditableMaterial(detail.id, materialPublicId);

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
  const materialPublicId = parseRouteUuid(materialId);
  if (materialPublicId === null) notFound();

  const detail = await getClassDetailBySlug(classId);
  if (!detail) notFound();
  const material = await getEditableMaterial(detail.id, materialPublicId);
  if (!material) notFound();

  return (
    <UnsavedChangesProvider>
      <BackLink href={`/teacher/module/${classId}`}>
        Back to modules
      </BackLink>

      <PageHeader
        title="EDIT MODULE"
        description={`${material.title} · ${detail.name}`}
      />

      <div className="w-full">
        <ModuleForm
          classId={detail.id}
          classSlug={classId}
          suggestedLevel={detail.suggestedLevel}
          storageReady={isB2Configured()}
          initialMaterial={material}
        />
      </div>
    </UnsavedChangesProvider>
  );
}
