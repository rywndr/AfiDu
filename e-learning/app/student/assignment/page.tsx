import type { Metadata } from 'next';
import { ClipboardCheck, GraduationCap } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { IconTile } from '@/components/ui/icon-tile';
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
        <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
          <EmptyHeader>
            <EmptyMedia>
              <IconTile>
                <GraduationCap aria-hidden="true" />
              </IconTile>
            </EmptyMedia>
            <EmptyTitle className="text-lg font-bold text-ink sm:text-xl">
              No class yet
            </EmptyTitle>
            <EmptyDescription>
              You are not in a class at the moment, so there is nothing set for you.
              Your teacher assigns classes in the AfiDu office app.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
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
        <Empty className="rounded-3xl border border-dashed border-shell-outline bg-white/60 px-5 py-10 sm:px-10 sm:py-14">
          <EmptyHeader>
            <EmptyMedia>
              <IconTile>
                <ClipboardCheck aria-hidden="true" />
              </IconTile>
            </EmptyMedia>
            <EmptyTitle className="text-lg font-bold text-ink sm:text-xl">
              Nothing set yet
            </EmptyTitle>
            <EmptyDescription>
              When your teacher publishes an assignment for {profile.className} it shows
              up here, with its due date and how many attempts you get.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
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
