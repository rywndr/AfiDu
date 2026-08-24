/**
 * When a student may work on an assignment.
 */

import { formatDateTime, pluralize } from '@/lib/format';

export type AssignmentWindow = {
  status: string;
  openAt: Date | null;
  dueAt: Date | null;
  allowLate: boolean;
};

export type WindowState =
  | 'unpublished'
  | 'upcoming'
  | 'open'
  | 'late'
  | 'closed';

export function windowState(
  assignment: AssignmentWindow,
  now: Date = new Date(),
): WindowState {
  if (assignment.status !== 'published') return 'unpublished';
  if (assignment.openAt && now < assignment.openAt) return 'upcoming';
  if (assignment.dueAt && now > assignment.dueAt) {
    return assignment.allowLate ? 'late' : 'closed';
  }
  return 'open';
}

/** Whether an attempt may be started or submitted right now. */
export function isAssignmentOpen(
  assignment: AssignmentWindow,
  now: Date = new Date(),
): boolean {
  const state = windowState(assignment, now);
  return state === 'open' || state === 'late';
}

/** What the student is told about the window they are in. */
function windowNotice(state: WindowState, assignment: AssignmentWindow): string | null {
  if (state === 'upcoming') {
    return `This assignment opens ${formatDateTime(assignment.openAt)}.`;
  }
  if (state === 'late') {
    return 'The due date has passed. Anything you hand in now is marked late.';
  }
  if (state === 'closed') {
    return 'The due date has passed and late work is not accepted.';
  }
  if (state === 'unpublished') {
    return 'This assignment is not available.';
  }
  return null;
}

export type AttemptClock = {
  /** When the student opened the attempt. */
  startedAt: Date;
  /** The assignment's limit, null when it is untimed. */
  timeLimitMinutes: number | null;
};

/**
 * When a timed attempt runs out, counted from the moment it was started, which
 * is what `Assignment.is_timed` describes. Null when there is no limit to run
 * out. The due date is a separate thing and is not folded in here.
 */
export function attemptDeadline({
  startedAt,
  timeLimitMinutes,
}: AttemptClock): Date | null {
  if (!timeLimitMinutes || timeLimitMinutes <= 0) return null;
  return new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
}

/** Seconds left before a deadline, never below zero. Null when there is none. */
export function secondsLeft(
  deadline: Date | null,
  now: Date = new Date(),
): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1000));
}

/** Whether a timed attempt's clock has already run out. */
export function hasAttemptExpired(
  clock: AttemptClock,
  now: Date = new Date(),
): boolean {
  const deadline = attemptDeadline(clock);
  return deadline !== null && now >= deadline;
}

/**
 * How much slack the server allows itself around a deadline.
 */
export const DEADLINE_GRACE_SECONDS = 10;

export type AttemptGateInput = AssignmentWindow & {
  maxAttempts: number;
  attemptsUsed: number;
  hasOpenAttempt: boolean;
};

export type AttemptGate = {
  /** The student may answer and hand in the attempt they have open. */
  canWork: boolean;
  /** The student may start a fresh attempt. */
  canStart: boolean;
  /** The one thing worth saying about the state, if anything. */
  notice: string | null;
};

export function attemptGate(
  input: AttemptGateInput,
  now: Date = new Date(),
): AttemptGate {
  const state = windowState(input, now);
  const notice = windowNotice(state, input);

  if (state !== 'open' && state !== 'late') {
    return { canWork: false, canStart: false, notice };
  }
  if (input.hasOpenAttempt) {
    return { canWork: true, canStart: false, notice };
  }
  if (input.attemptsUsed >= input.maxAttempts) {
    return {
      canWork: false,
      canStart: false,
      notice: `You have used all ${pluralize(input.maxAttempts, 'attempt')}.`,
    };
  }
  return { canWork: false, canStart: true, notice };
}
