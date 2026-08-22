import type { Metadata } from 'next';

import { EmptyDashboardPage } from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Modules | AfiDu E-Learning',
};

export default async function TeacherModulePage() {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  return (
    <>
      <PageHeader
        title="MODULE"
        description="Create and manage learning materials here."
      />
      <EmptyDashboardPage label="Module" />
    </>
  );
}
