import type { Metadata } from 'next';
import { ClipboardCheck, GraduationCap } from 'lucide-react';

import { EmptyState } from '@/components/dashboard/empty-state';
import { PageHeader } from '@/components/dashboard/page-header';
import { pluralize } from '@/lib/format';
import { requireStudentProfile } from '@/lib/student-access';
import { listStudentAssignments } from '@/lib/student-assignments';

import { StudentAssignmentCard } from './assignment-card';

export const metadata: Metadata = {
  title: 'Assignments | AfiDu E-Learning',
};

export default async function StudentAssignmentPage() {
  const profile = await requireStudentProfile();

  if (!profile || profile.classId === null) {
    return (
      <>
        <PageHeader
          title="ASSIGNMENT"
          description="Your exercises and quizzes appear here."
        />
        <EmptyState icon={GraduationCap} title="No class yet">
          You are not in a class at the moment, so there is nothing set for you.
          Your teacher assigns classes in the AfiDu office app.
        </EmptyState>
      </>
    );
  }

  const assignments = await listStudentAssignments(profile.id, profile.classId);
  const outstanding = assignments.filter(
    (item) => item.latestAttempt === null || item.latestAttempt.status === 'in_progress',
  ).length;

  return (
    <>
      <PageHeader
        title="ASSIGNMENT"
        description={
          assignments.length === 0
            ? `Set for ${profile.className}.`
            : `${pluralize(assignments.length, 'assignment')} for ${profile.className}` +
              (outstanding > 0 ? ` · ${outstanding} still to do` : ' · all handed in')
        }
      />

      {assignments.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nothing set yet">
          When your teacher publishes an assignment for {profile.className} it shows
          up here.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:gap-4 xl:grid-cols-2">
          {assignments.map((item) => (
            <li key={item.id}>
              <StudentAssignmentCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
