import type { Metadata } from 'next';

import { EmptyDashboardPage } from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Assignments | AfiDu E-Learning',
};

export default async function TeacherAssignmentPage() {
  await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);

  return (
    <>
      <PageHeader
        title="ASSIGNMENT"
        description="Create assignments and review student submissions here."
      />
      <EmptyDashboardPage label="Assignment" />
    </>
  );
}
