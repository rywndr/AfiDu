import type { Metadata } from 'next';

import { EmptyDashboardPage } from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_STUDENT, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Assignments | AfiDu E-Learning',
};

export default async function StudentAssignmentPage() {
  await requireRole([ROLE_STUDENT]);

  return (
    <>
      <PageHeader
        title="ASSIGNMENT"
        description="Your exercises, quizzes, and scores will appear here."
      />
      <EmptyDashboardPage label="Assignment" />
    </>
  );
}
