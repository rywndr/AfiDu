import type { Metadata } from 'next';

import { EmptyDashboardPage } from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_STUDENT, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Modules | AfiDu E-Learning',
};

export default async function StudentModulePage() {
  await requireRole([ROLE_STUDENT]);

  return (
    <>
      <PageHeader
        title="MODULE"
        description="Your learning materials will appear here."
      />
      <EmptyDashboardPage label="Module" />
    </>
  );
}
