import { TriangleAlert } from 'lucide-react';

import { pluralize } from '@/lib/format';
import {
  isStudentAssignmentDueSoon,
  type StudentAssignment,
} from '@/lib/student-assignments';

const MINUTE_MS = 60 * 1_000;

function formatTimeLeft(milliseconds: number): string {
  const totalMinutes = Math.max(1, Math.floor(milliseconds / MINUTE_MS));
  if (totalMinutes < 60) return pluralize(totalMinutes, 'minute');

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = pluralize(hours, 'hour');
  return minutes === 0
    ? hourText
    : `${hourText} ${pluralize(minutes, 'minute')}`;
}

export function DueSoonWarning({
  assignment,
  now = new Date(),
}: {
  assignment: Pick<StudentAssignment, 'dueAt' | 'latestAttempt'>;
  now?: Date;
}) {
  const timeLeft = assignment.dueAt
    ? assignment.dueAt.getTime() - now.getTime()
    : null;
  if (!isStudentAssignmentDueSoon(assignment, now) || timeLeft === null) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive"
    >
      <TriangleAlert aria-hidden="true" className="size-4 shrink-0" />
      <span>Due in {formatTimeLeft(timeLeft)}</span>
    </div>
  );
}
