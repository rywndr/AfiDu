import type { Metadata } from 'next';

import { PlaceholderSection } from '@/components/dashboard/dashboard-placeholders';
import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_STUDENT, getStudentProfile, requireRole } from '@/lib/session';

export const metadata: Metadata = {
  title: 'Student dashboard | Afidu',
};

export default async function StudentDashboardPage() {
  const session = await requireRole([ROLE_STUDENT]);
  const { user } = session;
  const profile = await getStudentProfile(user.id);
  const userName = profile?.name || user.name || user.email;

  return (
    <>
      <PageHeader
        title={`HELLO, ${userName.toUpperCase()}`}
        description="Have a great day!"
        tone="accent"
      />
      <PlaceholderSection title="Module" kind="cards" />
      <PlaceholderSection title="Assignment" kind="rows" />
    </>
  );
}
