/**
 * Turning what a student sent into rows, and closing an attempt.
 */

import 'server-only';

import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/db';
import {
  question,
  questionChoice,
  submission,
  submissionAnswer,
  submissionAnswerChoice,
  submissionFile,
} from '@/db/schema';
import { deleteObject } from '@/lib/b2';
import { questionHasChoices } from '@/lib/choices';
import type { AttemptAnswerInput, SaveAttemptInput } from '@/lib/form-schemas';
import { scoreObjectiveAnswers } from '@/lib/objective-grading';

type BatchItem = Parameters<typeof db.batch>[0][number];

export type AttemptQuestion = {
  id: number;
  order: number;
  kind: string;
  isRequired: boolean;
};

const SUBMITTED = 'submitted';

async function runBatch(statements: BatchItem[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as [BatchItem, ...BatchItem[]]);
}

/** `numeric(6, 2)` columns round-trip as strings. */
function decimal(value: number): string {
  return value.toFixed(2);
}

export async function listAttemptQuestions(
  assignmentId: number,
): Promise<AttemptQuestion[]> {
  return db
    .select({
      id: question.id,
      order: question.order,
      kind: question.kind,
      isRequired: question.isRequired,
    })
    .from(question)
    .where(eq(question.assignmentId, assignmentId))
    .orderBy(question.order, question.id);
}

/**
 * Reduce what was sent to what the stored questions allow.
 */

export async function normaliseAnswers(
  questions: AttemptQuestion[],
  submitted: AttemptAnswerInput[],
): Promise<AttemptAnswerInput[]> {
  const choiceQuestionIds = questions
    .filter((item) => questionHasChoices(item.kind))
    .map((item) => item.id);

  const choices = choiceQuestionIds.length
    ? await db
        .select({ id: questionChoice.id, questionId: questionChoice.questionId })
        .from(questionChoice)
        .where(inArray(questionChoice.questionId, choiceQuestionIds))
    : [];

  const allowed = new Map<number, Set<number>>();
  for (const choice of choices) {
    const existing = allowed.get(choice.questionId);
    if (existing) existing.add(choice.id);
    else allowed.set(choice.questionId, new Set([choice.id]));
  }

  const byQuestion = new Map(questions.map((item) => [item.id, item]));

  return submitted.flatMap((answer) => {
    const item = byQuestion.get(answer.questionId);
    if (!item) return [];

    const permitted = allowed.get(answer.questionId) ?? new Set<number>();
    const isChoice = questionHasChoices(item.kind);
    const isMulti = item.kind === 'multi_select';
    const single = answer.selectedChoiceId;

    return [
      {
        questionId: answer.questionId,
        selectedChoiceId:
          isChoice && !isMulti && single !== null && permitted.has(single) ? single : null,
        selectedChoiceIds: isMulti
          ? [...new Set(answer.selectedChoiceIds.filter((id) => permitted.has(id)))]
          : [],
        textAnswer:
          isChoice || item.kind === 'file_upload' || item.kind === 'audio_recording'
            ? ''
            : answer.textAnswer.trim(),
      },
    ];
  });
}

/**
 * Swap the stored answers for the submitted ones, links included.
 */

export async function replaceAnswers(
  submissionId: number,
  answers: AttemptAnswerInput[],
): Promise<void> {
  const answerIds = () =>
    db
      .select({ id: submissionAnswer.id })
      .from(submissionAnswer)
      .where(eq(submissionAnswer.submissionId, submissionId));

  await runBatch([
    db
      .delete(submissionAnswerChoice)
      .where(inArray(submissionAnswerChoice.submissionAnswerId, answerIds())),
    db.delete(submissionAnswer).where(eq(submissionAnswer.submissionId, submissionId)),
  ]);

  if (answers.length === 0) return;

  const now = new Date();
  const created = await db
    .insert(submissionAnswer)
    .values(
      answers.map((answer) => ({
        submissionId,
        questionId: answer.questionId,
        selectedChoiceId: answer.selectedChoiceId,
        textAnswer: answer.textAnswer,
        feedback: '',
        createdAt: now,
        updatedAt: now,
      })),
    )
    .returning({ id: submissionAnswer.id });

  // a single multi-row INSERT ... RETURNING gives the rows back in value order
  const links = answers.flatMap((answer, index) =>
    answer.selectedChoiceIds.map((choiceId) => ({
      submissionAnswerId: created[index].id,
      questionChoiceId: choiceId,
    })),
  );

  if (links.length > 0) {
    await db.insert(submissionAnswerChoice).values(links);
  }
}

/** How many files are on the attempt, counting the ones about to be added. */
export async function listAttemptFileQuestionIds(
  submissionId: number,
  incoming: SaveAttemptInput['files'],
): Promise<(number | null)[]> {
  const rows = await db
    .select({ questionId: submissionFile.questionId })
    .from(submissionFile)
    .where(eq(submissionFile.submissionId, submissionId));
  return [
    ...rows.map((row) => row.questionId),
    ...incoming.map((file) => file.questionId),
  ];
}

/**
 * Record uploads that are not on the attempt yet.
 */

export async function recordFiles(
  submissionId: number,
  files: SaveAttemptInput['files'],
): Promise<void> {
  if (files.length === 0) return;

  const existing = await db
    .select({ file: submissionFile.file })
    .from(submissionFile)
    .where(eq(submissionFile.submissionId, submissionId));

  const stored = new Set(existing.map((row) => row.file));
  const fresh = files.filter((file) => !stored.has(file.key));
  if (fresh.length === 0) return;

  const recordingQuestionIds = fresh.flatMap((file) =>
    file.questionId === null ? [] : [file.questionId],
  );
  const replaced = recordingQuestionIds.length
    ? await db
        .select({ id: submissionFile.id, key: submissionFile.file })
        .from(submissionFile)
        .where(
          and(
            eq(submissionFile.submissionId, submissionId),
            inArray(submissionFile.questionId, recordingQuestionIds),
          ),
        )
    : [];

  const insert = db.insert(submissionFile).values(
    fresh.map((file) => ({
      submissionId,
      questionId: file.questionId,
      file: file.key,
      originalFilename: file.originalFilename,
      sizeBytes: file.size,
      mimeType: file.mimeType,
      uploadedAt: new Date(),
    })),
  );

  if (replaced.length > 0) {
    await runBatch([
      db
        .delete(submissionFile)
        .where(inArray(submissionFile.id, replaced.map((file) => file.id))),
      insert,
    ]);
  } else {
    await insert;
  }

  await Promise.all(replaced.map((file) => deleteObject(file.key)));
}

/**
 * Close the attempt.
 */

export async function finaliseAttempt(
  submissionId: number,
  startedAt: Date,
  dueAt: Date | null,
  autoGrade: boolean,
  at: Date = new Date(),
): Promise<void> {
  const now = new Date();

  await db
    .update(submission)
    .set({
      status: SUBMITTED,
      submittedAt: at,
      isLate: Boolean(dueAt && at > dueAt),
      timeSpentSeconds: Math.max(
        0,
        Math.round((at.getTime() - startedAt.getTime()) / 1000),
      ),
      updatedAt: now,
    })
    .where(eq(submission.id, submissionId));

  if (autoGrade) await autoGradeAttempt(submissionId, now);
}

async function autoGradeAttempt(submissionId: number, now: Date): Promise<void> {
  const { answers, marks, autoScore } = await scoreObjectiveAnswers(submissionId);
  const statements: BatchItem[] = [];

  for (const answer of answers) {
    const mark = marks.get(answer.id);
    if (!mark) continue;

    statements.push(
      db
        .update(submissionAnswer)
        .set({
          isCorrect: mark.isCorrect,
          awardedPoints: mark.awardedPoints === null ? null : decimal(mark.awardedPoints),
          updatedAt: now,
        })
        .where(eq(submissionAnswer.id, answer.id)),
    );
  }

  // only the objective half is known now, so the total is that half alone; a
  // teacher marking the rest recalculates it.
  statements.push(
    db
      .update(submission)
      .set({
        autoScore: autoScore === null ? null : decimal(autoScore),
        totalScore: autoScore === null ? null : decimal(autoScore),
        updatedAt: now,
      })
      .where(eq(submission.id, submissionId)),
  );

  await runBatch(statements);
}
