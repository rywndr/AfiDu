import type { Metadata } from 'next';
import { BookOpen, GraduationCap } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { pluralize } from '@/lib/format';
import { requireStudentProfile } from '@/lib/student-access';
import { listStudentMaterials } from '@/lib/student-materials';

import { StudentModuleCard } from './module-card';

export const metadata: Metadata = {
  title: 'Modules | AfiDu E-Learning',
};

export default async function StudentModulePage() {
  const profile = await requireStudentProfile();

  if (!profile || profile.classId === null) {
    return (
      <>
        <PageHeader
          title="MODULE"
          description="Your learning materials appear here."
        />
        <EmptyState icon={GraduationCap} title="No class yet">
          You are not in a class at the moment, so no modules are shared with you.
        </EmptyState>
      </>
    );
  }

  const materials = await listStudentMaterials(profile.classId);

  return (
    <>
      <PageHeader
        title="MODULE"
        description={
          materials.length === 0
            ? `Shared with ${profile.className}.`
            : `${pluralize(materials.length, 'module')} for ${profile.className}`
        }
      />

      {materials.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nothing shared yet">
          When your teacher publishes a module for {profile.className} it turns up
          here to read, watch or download.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          {materials.map((material) => (
            <li key={material.id}>
              <StudentModuleCard material={material} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
