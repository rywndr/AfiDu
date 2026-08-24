/**
 * Attempt writes, made by student who said attempt.
 */
import 'server-only';

import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, submission } from '@/db/schema';
import type { MutationResult } from '@/lib/assignment-mutations';
import {
  attemptDeadline,
  attemptGate,
  DEADLINE_GRACE_SECONDS,
  hasAttemptExpired,
  isAssignmentOpen,
} from '@/lib/assignment-availability';
import { missingRequiredAnswers } from '@/lib/attempt-form';
import {
  finaliseAttempt,
  listAttemptFileQuestionIds,
  listAttemptQuestions,
  normaliseAnswers,
  recordFiles,
  replaceAnswers,
} from '@/lib/attempt-writes';
import type { SaveAttemptInput } from '@/lib/form-schemas';

const IN_PROGRESS = 'in_progress';

export type StartAttemptResult = MutationResult & { submissionId?: number };

/**
 * Open an attempt, or continue the one already in progress.
 */
export async function startAttempt(
  studentId: number,
  classId: number,
  assignmentId: number,
): Promise<StartAttemptResult> {
  const [item] = await db
    .select({
      status: assignment.status,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      allowLate: assignment.allowLate,
      maxAttempts: assignment.maxAttempts,
    })
    .from(assignment)
    .where(
      and(
        eq(assignment.id, assignmentId),
        eq(assignment.studentClassId, classId),
        eq(assignment.status, 'published'),
      ),
    )
    .limit(1);

  if (!item) return { error: 'That assignment is not available.', status: 404 };

  const attempts = await db
    .select({
      id: submission.id,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
    })
    .from(submission)
    .where(
      and(eq(submission.assignmentId, assignmentId), eq(submission.studentId, studentId)),
    )
    .orderBy(asc(submission.attemptNumber));

  const open = attempts.find((attempt) => attempt.status === IN_PROGRESS);
  if (open) return { submissionId: open.id };

  const gate = attemptGate({ ...item, attemptsUsed: attempts.length, hasOpenAttempt: false });
  if (!gate.canStart) {
    return { error: gate.notice ?? 'This assignment cannot be started.', status: 409 };
  }

  const now = new Date();
  const attemptNumber =
    attempts.reduce((highest, attempt) => Math.max(highest, attempt.attemptNumber), 0) + 1;

  try {
    const [created] = await db
      .insert(submission)
      .values({
        assignmentId,
        studentId,
        attemptNumber,
        status: IN_PROGRESS,
        startedAt: now,
        feedback: '',
        isLate: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: submission.id });

    return { submissionId: created.id };
  } catch (error) {
    console.error('could not start an attempt', error);
    return { error: 'Could not start the assignment. Please try again.', status: 500 };
  }
}

/**
 * Save answers on an open attempt, and hand it in when `finalize` is set.
 */
export async function saveAttempt(
  studentId: number,
  submissionId: number,
  input: SaveAttemptInput,
): Promise<MutationResult> {
  const [current] = await db
    .select({
      status: submission.status,
      startedAt: submission.startedAt,
      assignmentId: submission.assignmentId,
      assignmentStatus: assignment.status,
      openAt: assignment.openAt,
      dueAt: assignment.dueAt,
      allowLate: assignment.allowLate,
      autoGrade: assignment.autoGrade,
      timeLimitMinutes: assignment.timeLimitMinutes,
    })
    .from(submission)
    .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
    .where(and(eq(submission.id, submissionId), eq(submission.studentId, studentId)))
    .limit(1);

  if (!current) return { error: 'That attempt no longer exists.', status: 404 };
  if (current.status !== IN_PROGRESS) {
    return { error: 'This attempt has already been handed in.', status: 409 };
  }
  if (
    !isAssignmentOpen({
      status: current.assignmentStatus,
      openAt: current.openAt,
      dueAt: current.dueAt,
      allowLate: current.allowLate,
    })
  ) {
    return {
      error: 'This assignment is closed and can no longer be saved.',
      status: 409,
    };
  }

  const deadline = attemptDeadline(current);
  // judged a few seconds ahead, so a hand-in the countdown sent at zero is read
  // as the timeout it is rather than as an early one
  const expired = hasAttemptExpired(
    current,
    new Date(Date.now() + DEADLINE_GRACE_SECONDS * 1000),
  );
  if (expired && !input.finalize) {
    return {
      error: 'Your time is up, so this attempt can only be handed in.',
      status: 409,
    };
  }

  const questions = await listAttemptQuestions(current.assignmentId);
  const answers = await normaliseAnswers(questions, input.answers);

  if (input.finalize && !expired) {
    const fileQuestionIds = await listAttemptFileQuestionIds(
      submissionId,
      input.files,
    );
    const missing = missingRequiredAnswers(questions, answers, fileQuestionIds);
    if (missing.length > 0) {
      return {
        error: `Answer question ${missing.join(', ')} before handing this in.`,
        status: 400,
      };
    }
  }

  try {
    await replaceAnswers(submissionId, answers);
    await recordFiles(submissionId, input.files);

    if (input.finalize) {
      await finaliseAttempt(
        submissionId,
        current.startedAt,
        current.dueAt,
        current.autoGrade,
        // a timed-out attempt is recorded as handed in when its clock ran out,
        // however long the round trip took
        expired && deadline ? deadline : new Date(),
      );
    } else {
      await db
        .update(submission)
        .set({ updatedAt: new Date() })
        .where(eq(submission.id, submissionId));
    }
  } catch (error) {
    console.error('could not save an attempt', error);
    return { error: 'Could not save your answers. Please try again.', status: 500 };
  }

  return {};
}

/**
 * Close a timed attempt that the time ran out while nobody was watching.
 */
export async function expireAttempt(
  studentId: number,
  submissionId: number,
): Promise<void> {
  const [current] = await db
    .select({
      status: submission.status,
      startedAt: submission.startedAt,
      dueAt: assignment.dueAt,
      autoGrade: assignment.autoGrade,
      timeLimitMinutes: assignment.timeLimitMinutes,
    })
    .from(submission)
    .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
    .where(and(eq(submission.id, submissionId), eq(submission.studentId, studentId)))
    .limit(1);

  if (!current || current.status !== IN_PROGRESS) return;

  const deadline = attemptDeadline(current);
  if (deadline === null || !hasAttemptExpired(current)) return;

  try {
    await finaliseAttempt(
      submissionId,
      current.startedAt,
      current.dueAt,
      current.autoGrade,
      deadline,
    );
  } catch (error) {
    console.error('could not close a timed-out attempt', error);
  }
}
