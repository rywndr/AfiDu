import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { BackLink } from '@/components/dashboard/back-link';
import { PageHeader } from '@/components/dashboard/page-header';
import { materialTypeLabel } from '@/lib/choices';
import { formatDate } from '@/lib/format';
import { parseRouteId } from '@/lib/route-params';
import { requireStudentProfile } from '@/lib/student-access';
import { getStudentMaterial } from '@/lib/student-materials';

import { ModuleBrief } from './module-brief';
import { ModuleViewer } from './module-viewer';

export const metadata: Metadata = {
  title: 'Module | AfiDu E-Learning',
};

export default async function StudentModuleDetailPage({
  params,
}: PageProps<'/student/module/[materialId]'>) {
  const profile = await requireStudentProfile();
  if (!profile || profile.classId === null) redirect('/student/module');

  const materialId = parseRouteId((await params).materialId);
  if (Number.isNaN(materialId)) notFound();

  const material = await getStudentMaterial(profile.classId, materialId);
  if (!material) notFound();

  return (
    <>
      <BackLink href="/student/module">All modules</BackLink>

      <PageHeader
        title={material.title.toUpperCase()}
        description={`${materialTypeLabel(material.materialType)} · added ${formatDate(
          material.uploadedAt,
        )}`}
      />

      <ModuleBrief material={material} />
      <ModuleViewer material={material} />
    </>
  );
}
