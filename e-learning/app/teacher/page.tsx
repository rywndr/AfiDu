import type { Metadata } from 'next';

import { PageHeader } from '@/components/dashboard/page-header';
import { ROLE_SUPERUSER, ROLE_TEACHER, requireRole } from '@/lib/session';
import { listRecentActivity } from '@/lib/teacher-activity';
import { listMorningStack } from '@/lib/teacher-stack';

import { MorningStack } from './morning-stack';
import { RecentActivity } from './recent-activity';

export const metadata: Metadata = {
  title: 'Teacher dashboard | Afidu',
};

export default async function TeacherDashboardPage() {
  const { user } = await requireRole([ROLE_TEACHER, ROLE_SUPERUSER]);
  const userName = user.name || user.email;

  // One clock for the whole render, so the stack splits overdue from due soon on
  // the same instant the activity timestamps are counted back from.
  const now = new Date();
  const [stack, activity] = await Promise.all([
    listMorningStack(now),
    listRecentActivity(now),
  ]);

  return (
    <>
      <PageHeader
        title={`HELLO, ${userName.toUpperCase()}`}
        description="Have a great day!"
      />
      <MorningStack stack={stack} now={now} />
      <RecentActivity events={activity} now={now} />
    </>
  );
}
