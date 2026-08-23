/** The status of a submission, or its absence */
import {
  CircleCheck,
  CircleDashed,
  Hourglass,
  type LucideIcon,
} from 'lucide-react';

import { Pill } from '@/components/dashboard/pill';
import { submissionStatusLabel } from '@/lib/choices';

const statusStyle: Record<string, { className: string; icon: LucideIcon }> = {
  in_progress: { className: 'bg-shell text-ink-soft', icon: CircleDashed },
  submitted: {
    className: 'bg-accent-warm-soft text-accent-warm-strong',
    icon: Hourglass,
  },
  graded: {
    className: 'bg-accent-primary-soft text-accent-primary-strong',
    icon: CircleCheck,
  },
  returned: { className: 'bg-accent-cool-soft text-accent-cool', icon: CircleCheck },
};

/** A null status means the student has not opened the assignment at all. */
export function SubmissionStatusPill({ status }: { status: string | null }) {
  if (status === null) {
    return (
      <Pill icon={CircleDashed} className="bg-placeholder text-ink-soft">
        Not started
      </Pill>
    );
  }

  const { className, icon } = statusStyle[status] ?? statusStyle.in_progress;
  return (
    <Pill icon={icon} className={className}>
      {submissionStatusLabel(status)}
    </Pill>
  );
}
