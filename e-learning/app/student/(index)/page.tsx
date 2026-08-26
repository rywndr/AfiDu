import type { Metadata } from 'next';
import { GraduationCap, Inbox } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardSection } from '@/components/dashboard/surfaces';
import { pluralize } from '@/lib/format';
import { listViewClass } from '@/lib/list-view';
import { ROLE_STUDENT, getStudentProfile, requireRole } from '@/lib/session';
import { isStudentAssignmentDueSoon } from '@/lib/student-assignments';
import { feedItemKey, listStudentFeed, type StudentFeedItem } from '@/lib/student-feed';

import { StudentAssignmentCard } from '../assignment/assignment-card';
import { StudentModuleCard } from '../module/module-card';

export const metadata: Metadata = {
  title: 'Student dashboard | Afidu',
};

function FeedCard({ item }: { item: StudentFeedItem }) {
  switch (item.kind) {
    case 'module':
      return <StudentModuleCard material={item.material} />;
    case 'assignment':
      return <StudentAssignmentCard item={item.assignment} />;
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

export default async function StudentDashboardPage() {
  const { user } = await requireRole([ROLE_STUDENT]);
  const profile = await getStudentProfile(user.id);
  const userName = profile?.name || user.name || user.email;
  const greeting = (
    <PageHeader
      title={`HELLO, ${userName.toUpperCase()}`}
      description="Have a great day!"
      tone="accent"
    />
  );

  if (!profile || profile.classId === null) {
    return (
      <>
        {greeting}
        <EmptyState icon={GraduationCap} title="No class yet">
          You are not in a class at the moment, so no modules or assignments are
          shared with you.
        </EmptyState>
      </>
    );
  }

  const feed = await listStudentFeed({
    studentId: profile.id,
    classId: profile.classId,
  });
  const now = new Date();
  const importantAssignments = feed.items
    .flatMap((item) =>
      item.kind === 'assignment' &&
      isStudentAssignmentDueSoon(item.assignment, now)
        ? [item.assignment]
        : [],
    )
    .sort(
      (left, right) =>
        (left.dueAt?.getTime() ?? Number.POSITIVE_INFINITY) -
        (right.dueAt?.getTime() ?? Number.POSITIVE_INFINITY),
    );
  const summary = [
    pluralize(feed.moduleTotal, 'module'),
    pluralize(feed.assignmentTotal, 'assignment'),
    ...(feed.outstanding > 0 ? [`${feed.outstanding} still to do`] : []),
  ].join(' · ');

  return (
    <>
      {greeting}

      {importantAssignments.length > 0 ? (
        <DashboardSection title="Important">
          <ul className={listViewClass('rows')}>
            {importantAssignments.map((item) => (
              <li key={item.id}>
                <StudentAssignmentCard item={item} />
              </li>
            ))}
          </ul>
        </DashboardSection>
      ) : null}

      <DashboardSection
        title="Latest for your class"
        aside={
          feed.items.length > 0 ? (
            <span className="shrink-0 text-xs font-semibold text-ink-subtle sm:text-sm">
              {summary}
            </span>
          ) : null
        }
      >
        {feed.items.length === 0 ? (
          <EmptyState icon={Inbox} title="Nothing shared yet">
            When your teacher publishes a module or sets an assignment for{' '}
            {profile.className} it turns up here, newest first.
          </EmptyState>
        ) : (
          <ul className={listViewClass('rows')}>
            {feed.items.map((item) => (
              <li key={feedItemKey(item)}>
                <FeedCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </DashboardSection>
    </>
  );
}
