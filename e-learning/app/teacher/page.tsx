import type { Metadata } from 'next';

import {
  PlaceholderSection,
  StatsPlaceholder,
} from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Teacher dashboard | Afidu',
};

export default async function TeacherDashboardPage() {
  const session = await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);
  const { user } = session;
  const userName = user.name || user.email;

  return (
    <>
      <PageHeader
        title={`HELLO, ${userName.toUpperCase()}`}
        description="Have a great day!"
      />
      <StatsPlaceholder />
      <PlaceholderSection title="Module" kind="rows" />
      <PlaceholderSection title="Assignment" kind="rows" />
    </>
  );
}
