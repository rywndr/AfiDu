/**
 * The state of a student's attempt at an assignment.
 */
import 'server-only';

import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import { submission, submissionAnswer, submissionAnswerChoice, submissionFile } from '@/db/schema';
import type { SubmissionFileRef } from '@/lib/assignments';
import {
  attemptDeadline,
  attemptGate,
  hasAttemptExpired,
  secondsLeft,
  type AttemptGate,
} from '@/lib/assignment-availability';
import {
  getStudentAssignment,
  listStudentQuestions,
  type StudentAssignment,
  type StudentQuestion,
} from '@/lib/student-assignments';
import { expireAttempt } from '@/lib/student-submission-mutations';

/** One answer as it was last saved. */
export type AttemptAnswer = {
  questionId: number;
  selectedChoiceId: number | null;
  selectedChoiceIds: number[];
  textAnswer: string;
  /** Marks, filled in once the attempt has been scored. */
  isCorrect: boolean | null;
  awardedPoints: string | null;
  feedback: string;
};

export type AttemptDetail = {
  id: number;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  autoScore: string | null;
  manualScore: string | null;
  totalScore: string | null;
  feedback: string;
  isLate: boolean;
  timeSpentSeconds: number | null;
  answers: AttemptAnswer[];
  /** Uploads that answer the assignment as a whole. */
  files: SubmissionFileRef[];
};

export type StudentAssignmentView = {
  assignment: StudentAssignment;
  questions: StudentQuestion[];
  gate: AttemptGate;
  /** The attempt on screen. The open one, or the newest finished one. */
  attempt: AttemptDetail | null;
  /** Whether that attempt is the student's to answer and hand in. */
  isWorking: boolean;
  secondsRemaining: number | null;
};

const IN_PROGRESS = 'in_progress';

export async function getStudentAssignmentView(
  studentId: number,
  classId: number,
  assignmentId: number,
): Promise<StudentAssignmentView | null> {
  let item = await getStudentAssignment(studentId, classId, assignmentId);
  if (!item) return null;

  if (
    item.latestAttempt?.status === IN_PROGRESS &&
    hasAttemptExpired({
      startedAt: item.latestAttempt.startedAt,
      timeLimitMinutes: item.timeLimitMinutes,
    })
  ) {
    await expireAttempt(studentId, item.latestAttempt.id);
    const reread = await getStudentAssignment(studentId, classId, assignmentId);
    if (!reread) return null;
    item = reread;
  }

  const gate = attemptGate({
    status: item.status,
    openAt: item.openAt,
    dueAt: item.dueAt,
    allowLate: item.allowLate,
    maxAttempts: item.maxAttempts,
    attemptsUsed: item.attemptsUsed,
    hasOpenAttempt: item.latestAttempt?.status === IN_PROGRESS,
  });

  const isWorking = gate.canWork && item.latestAttempt?.status === IN_PROGRESS;
  const attempt = item.latestAttempt
    ? await getAttemptDetail(studentId, item.latestAttempt.id)
    : null;

  // the key is only ever shown against an attempt that is already handed in
  const revealKey =
    item.revealAnswersAfterSubmit && attempt !== null && attempt.status !== IN_PROGRESS;

  return {
    assignment: item,
    questions: orderQuestions(
      await listStudentQuestions(assignmentId, { revealKey }),
      item.shuffleQuestions ? attempt?.id : undefined,
    ),
    gate,
    attempt,
    isWorking,
    secondsRemaining:
      isWorking && attempt
        ? secondsLeft(
            attemptDeadline({
              startedAt: attempt.startedAt,
              timeLimitMinutes: item.timeLimitMinutes,
            }),
          )
        : null,
  };
}

export async function getAttemptDetail(
  studentId: number,
  submissionId: number,
): Promise<AttemptDetail | null> {
  const [row] = await db
    .select({
      id: submission.id,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      autoScore: submission.autoScore,
      manualScore: submission.manualScore,
      totalScore: submission.totalScore,
      feedback: submission.feedback,
      isLate: submission.isLate,
      timeSpentSeconds: submission.timeSpentSeconds,
    })
    .from(submission)
    .where(and(eq(submission.id, submissionId), eq(submission.studentId, studentId)))
    .limit(1);

  if (!row) return null;

  const [answers, files] = await Promise.all([
    db
      .select({
        id: submissionAnswer.id,
        questionId: submissionAnswer.questionId,
        selectedChoiceId: submissionAnswer.selectedChoiceId,
        textAnswer: submissionAnswer.textAnswer,
        isCorrect: submissionAnswer.isCorrect,
        awardedPoints: submissionAnswer.awardedPoints,
        feedback: submissionAnswer.feedback,
      })
      .from(submissionAnswer)
      .where(eq(submissionAnswer.submissionId, submissionId)),
    db
      .select({
        id: submissionFile.id,
        questionId: submissionFile.questionId,
        file: submissionFile.file,
        originalFilename: submissionFile.originalFilename,
        sizeBytes: submissionFile.sizeBytes,
        mimeType: submissionFile.mimeType,
        uploadedAt: submissionFile.uploadedAt,
      })
      .from(submissionFile)
      .where(eq(submissionFile.submissionId, submissionId))
      .orderBy(desc(submissionFile.uploadedAt)),
  ]);

  const answerIds = answers.map((answer) => answer.id);
  const multiChoices = answerIds.length
    ? await db
        .select({
          answerId: submissionAnswerChoice.submissionAnswerId,
          choiceId: submissionAnswerChoice.questionChoiceId,
        })
        .from(submissionAnswerChoice)
        .where(inArray(submissionAnswerChoice.submissionAnswerId, answerIds))
        .orderBy(asc(submissionAnswerChoice.questionChoiceId))
    : [];

  const chosenByAnswer = new Map<number, number[]>();
  for (const link of multiChoices) {
    const existing = chosenByAnswer.get(link.answerId);
    if (existing) existing.push(link.choiceId);
    else chosenByAnswer.set(link.answerId, [link.choiceId]);
  }

  return {
    ...row,
    answers: answers.map(({ id, ...answer }) => ({
      ...answer,
      selectedChoiceIds: chosenByAnswer.get(id) ?? [],
    })),
    files: files.map(({ file, ...meta }) => ({ ...meta, hasFile: Boolean(file) })),
  };
}

/**
 * The attempt if it is this student's and still open.
 */
export async function getOpenAttempt(
  studentId: number,
  submissionId: number,
): Promise<{ id: number; assignmentId: number } | null> {
  const [row] = await db
    .select({ id: submission.id, assignmentId: submission.assignmentId })
    .from(submission)
    .where(
      and(
        eq(submission.id, submissionId),
        eq(submission.studentId, studentId),
        eq(submission.status, IN_PROGRESS),
      ),
    )
    .limit(1);

  return row ?? null;
}

/**
 * Whether a submission is this student's at all, used by the file download route
 * so a student can open what they handed in without seeing anyone else's.
 */
export async function ownsSubmission(
  studentId: number,
  submissionId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: submission.id })
    .from(submission)
    .where(and(eq(submission.id, submissionId), eq(submission.studentId, studentId)))
    .limit(1);

  return Boolean(row);
}

/**
 * Shuffle the questions for one attempt.
 */
function orderQuestions(
  questions: StudentQuestion[],
  seed: number | undefined,
): StudentQuestion[] {
  if (seed === undefined || questions.length < 2) return questions;

  const shuffled = [...questions];
  let state = seed * 2_654_435_761 + 1;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    // xorshift: any cheap, stable generator does, as this only has to be stable
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const pick = Math.abs(state) % (index + 1);
    [shuffled[index], shuffled[pick]] = [shuffled[pick], shuffled[index]];
  }

  return shuffled;
}
