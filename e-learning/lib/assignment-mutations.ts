/**
 * Assignment writes.
 *
 * Two Django behaviours have to be reproduced by hand here:
 *
 * 1. **Cascades are application-level.** Django's `on_delete=CASCADE` is
 *    enforced in Python, not by the database -- the FK constraints it creates
 *    carry no `ON DELETE` action. Deleting an assignment straight from SQL would
 *    fail on its questions and submissions, so every dependent row is removed
 *    explicitly, children first.
 * 2. **`Assignment.save()` fills the slug**, and `(assignment, order)` on
 *    questions and `(question, order)` on choices are unique, so reordering has
 *    to avoid transient collisions.
 */

import 'server-only';

import { and, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assignment,
  question,
  questionChoice,
  studentClass,
  studyMaterial,
  submission,
  submissionAnswer,
  submissionAnswerChoice,
  submissionFile,
} from '@/db/schema';
import { questionHasChoices } from '@/lib/choices';
import { deleteObject } from '@/lib/b2';
import type { AssignmentInput, GradeSubmissionInput } from '@/lib/form-schemas';
import { scoreObjectiveAnswers } from '@/lib/objective-grading';
import { buildAssignmentSlug } from '@/lib/assignments';

export type MutationResult = { error?: string; status?: number };

type BatchItem = Parameters<typeof db.batch>[0][number];

/** `db.batch` insists on a non-empty tuple; this keeps the call sites readable. */
async function runBatch(statements: BatchItem[]): Promise<void> {
  if (statements.length === 0) return;
  await db.batch(statements as [BatchItem, ...BatchItem[]]);
}

/** `numeric(6, 2)` columns round-trip as strings. */
function decimal(value: number): string {
  return value.toFixed(2);
}

function toDate(value: string): Date | null {
  return value ? new Date(value) : null;
}

async function classExists(classId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: studentClass.id })
    .from(studentClass)
    .where(eq(studentClass.id, classId))
    .limit(1);
  return Boolean(row);
}

/** A material may only be referenced if it belongs to the same class. */
async function materialBelongsToClass(
  materialId: number,
  classId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ id: studyMaterial.id })
    .from(studyMaterial)
    .where(
      and(eq(studyMaterial.id, materialId), eq(studyMaterial.studentClassId, classId)),
    )
    .limit(1);
  return Boolean(row);
}

/** The columns shared by insert and update, derived from the validated input. */
function assignmentValues(input: AssignmentInput) {
  return {
    title: input.title,
    description: input.description.trim(),
    category: input.category,
    level: input.level,
    studentClassId: input.classId,
    materialId: input.materialId,
    year: input.year,
    semester: input.semester,
    status: input.status,
    openAt: toDate(input.openAt),
    dueAt: toDate(input.dueAt),
    timeLimitMinutes: input.timeLimitMinutes,
    maxAttempts: input.maxAttempts,
    allowLate: input.allowLate,
    allowFileUpload: input.allowFileUpload,
    autoGrade: input.autoGrade,
    shuffleQuestions: input.shuffleQuestions,
    revealAnswersAfterSubmit: input.revealAnswersAfterSubmit,
    maxPoints: decimal(input.maxPoints),
  };
}

export async function createAssignment(
  input: AssignmentInput,
  userId: number | null,
): Promise<MutationResult> {
  const uploadedAudio = input.questions.flatMap((item) =>
    item.audio ? [item.audio.key] : [],
  );
  const fail = async (error: string, status = 400): Promise<MutationResult> => {
    await Promise.all(uploadedAudio.map(deleteObject));
    return { error, status };
  };

  if (!(await classExists(input.classId))) {
    return fail('That class no longer exists.', 404);
  }
  if (
    input.materialId !== null &&
    !(await materialBelongsToClass(input.materialId, input.classId))
  ) {
    return fail('That module is not available to this class.');
  }

  const now = new Date();

  try {
    const [created] = await db
      .insert(assignment)
      .values({
        ...assignmentValues(input),
        slug: await buildAssignmentSlug(input.title),
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      })
      .returning({ id: assignment.id });

    if (input.questions.length > 0) {
      await insertQuestions(
        created.id,
        input.questions.map((item, index) => ({ item, order: index + 1 })),
      );
    }

    return {};
  } catch (error) {
    console.error('could not create assignment', error);
    return fail('Could not save the assignment. Please try again.', 500);
  }
}

export async function updateAssignment(
  input: AssignmentInput,
  assignmentId: number,
): Promise<MutationResult> {
  const replacementAudio = input.questions.flatMap((item) =>
    item.audio ? [item.audio.key] : [],
  );
  const fail = async (error: string, status = 400): Promise<MutationResult> => {
    await Promise.all(replacementAudio.map(deleteObject));
    return { error, status };
  };
  const [current] = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      slug: assignment.slug,
      status: assignment.status,
    })
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.studentClassId, input.classId)),
    )
    .limit(1);

  if (!current) return fail('That assignment no longer exists.', 404);
  if (current.status === 'published') {
    return fail('Published assignments cannot be edited.', 409);
  }
  if (
    input.materialId !== null &&
    !(await materialBelongsToClass(input.materialId, input.classId))
  ) {
    return fail('That module is not available to this class.');
  }

  try {
    await db
      .update(assignment)
      .set({
        ...assignmentValues(input),
        slug:
          input.title === current.title
            ? current.slug
            : await buildAssignmentSlug(input.title),
        updatedAt: new Date(),
      })
      .where(eq(assignment.id, assignmentId));

    const discardedAudio = await replaceQuestions(assignmentId, input.questions);
    await Promise.all(discardedAudio.map(deleteObject));
    return {};
  } catch (error) {
    console.error('could not update assignment', error);
    return fail('Could not update the assignment. Please try again.', 500);
  }
}

export async function deleteAssignment(
  classId: number,
  assignmentId: number,
): Promise<MutationResult> {
  const [row] = await db
    .select({ id: assignment.id })
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.studentClassId, classId)),
    )
    .limit(1);

  if (!row) return { error: 'That assignment no longer exists.', status: 404 };

  const questionAudio = await db
    .select({ key: question.audio })
    .from(question)
    .where(eq(question.assignmentId, assignmentId));

  const submissionIds = () =>
    db
      .select({ id: submission.id })
      .from(submission)
      .where(eq(submission.assignmentId, assignmentId));
  const questionIds = () =>
    db
      .select({ id: question.id })
      .from(question)
      .where(eq(question.assignmentId, assignmentId));

  try {
    await db.batch([
      db
        .delete(submissionAnswerChoice)
        .where(
          inArray(
            submissionAnswerChoice.submissionAnswerId,
            db
              .select({ id: submissionAnswer.id })
              .from(submissionAnswer)
              .where(inArray(submissionAnswer.submissionId, submissionIds())),
          ),
        ),
      db
        .delete(submissionAnswer)
        .where(inArray(submissionAnswer.submissionId, submissionIds())),
      db
        .delete(submissionFile)
        .where(inArray(submissionFile.submissionId, submissionIds())),
      db.delete(submission).where(eq(submission.assignmentId, assignmentId)),
      db.delete(questionChoice).where(inArray(questionChoice.questionId, questionIds())),
      db.delete(question).where(eq(question.assignmentId, assignmentId)),
      db.delete(assignment).where(eq(assignment.id, assignmentId)),
    ]);
  } catch (error) {
    console.error('could not delete assignment', error);
    return { error: 'Could not delete the assignment. Please try again.', status: 500 };
  }

  await Promise.all(
    questionAudio.filter((file) => file.key).map((file) => deleteObject(file.key)),
  );

  return {};
}

/**
 * Throw away every attempt one student made at an assignment, so they can start
 * again from a clean slate. Cascades by hand like `deleteAssignment` does, and
 * the uploads go with it: the rows first, then the B2 objects behind them, in
 * the same order as `deleteStudyMaterial`.
 */
export async function resetStudentSubmissions(
  classId: number,
  assignmentId: number,
  studentId: number,
): Promise<MutationResult> {
  const [row] = await db
    .select({ id: assignment.id })
    .from(assignment)
    .where(
      and(eq(assignment.id, assignmentId), eq(assignment.studentClassId, classId)),
    )
    .limit(1);

  if (!row) return { error: 'That assignment no longer exists.', status: 404 };

  const submissionIds = () =>
    db
      .select({ id: submission.id })
      .from(submission)
      .where(
        and(
          eq(submission.assignmentId, assignmentId),
          eq(submission.studentId, studentId),
        ),
      );

  // read the keys while the rows are still there
  const files = await db
    .select({ key: submissionFile.file })
    .from(submissionFile)
    .where(inArray(submissionFile.submissionId, submissionIds()));

  try {
    await db.batch([
      db
        .delete(submissionAnswerChoice)
        .where(
          inArray(
            submissionAnswerChoice.submissionAnswerId,
            db
              .select({ id: submissionAnswer.id })
              .from(submissionAnswer)
              .where(inArray(submissionAnswer.submissionId, submissionIds())),
          ),
        ),
      db
        .delete(submissionAnswer)
        .where(inArray(submissionAnswer.submissionId, submissionIds())),
      db
        .delete(submissionFile)
        .where(inArray(submissionFile.submissionId, submissionIds())),
      db
        .delete(submission)
        .where(
          and(
            eq(submission.assignmentId, assignmentId),
            eq(submission.studentId, studentId),
          ),
        ),
    ]);
  } catch (error) {
    console.error('could not reset submission', error);
    return { error: 'Could not reset the submission. Please try again.', status: 500 };
  }

  for (const file of files) {
    if (file.key) await deleteObject(file.key);
  }

  return {};
}

type QuestionInput = AssignmentInput['questions'][number];

/** Choices only exist for the kinds that carry an answer key. */
function choicesFor(item: QuestionInput) {
  return questionHasChoices(item.kind) ? item.choices : [];
}

/** Insert new questions at the given orders, together with their choices. */
async function insertQuestions(
  assignmentId: number,
  entries: { item: QuestionInput; order: number }[],
): Promise<void> {
  if (entries.length === 0) return;

  const now = new Date();
  const created = await db
    .insert(question)
    .values(
      entries.map(({ item, order }) => ({
        assignmentId,
        order,
        kind: item.kind,
        prompt: item.prompt,
        audio: item.audio?.key ?? '',
        points: decimal(item.points),
        explanation: item.explanation.trim(),
        isRequired: item.isRequired,
        createdAt: now,
        updatedAt: now,
      })),
    )
    .returning({ id: question.id });

  // a single multi-row INSERT ... RETURNING gives the rows back in value order
  const choiceRows = entries.flatMap(({ item }, index) =>
    choicesFor(item).map((choice, choiceIndex) => ({
      questionId: created[index].id,
      order: choiceIndex + 1,
      text: choice.text,
      isCorrect: choice.isCorrect,
    })),
  );

  if (choiceRows.length > 0) {
    await db.insert(questionChoice).values(choiceRows);
  }
}

/**
 * Bring the stored questions in line with the submitted list.
 *
 * Existing questions are matched by id and updated in place so that submissions
 * keep pointing at them; questions dropped from the list are deleted along with
 * everything that references them. Editing the options of an already-answered
 * question can clear what a student picked -- the same thing Django's
 * `SET_NULL` on `SubmissionAnswer.selected_choice` does.
 */
async function replaceQuestions(
  assignmentId: number,
  questions: QuestionInput[],
): Promise<string[]> {
  const existing = await db
    .select({ id: question.id, audio: question.audio })
    .from(question)
    .where(eq(question.assignmentId, assignmentId));

  const existingIds = new Set(existing.map((row) => row.id));
  const isKept = (item: QuestionInput) => item.id !== null && existingIds.has(item.id);
  const keptIds = new Set(
    questions.filter(isKept).map((item) => item.id as number),
  );
  const removedIds = [...existingIds].filter((id) => !keptIds.has(id));
  const existingAudio = new Map(existing.map((row) => [row.id, row.audio]));
  const discardedAudio = existing
    .filter((row) => removedIds.includes(row.id) && row.audio)
    .map((row) => row.audio);

  const now = new Date();
  const statements: BatchItem[] = [];

  if (removedIds.length > 0) {
    statements.push(...deleteQuestionStatements(removedIds));
  }

  if (existingIds.size > 0) {
    // `(assignment, order)` is unique, so the surviving rows are parked well
    // above any final order first -- otherwise two questions swapping places
    // would collide halfway through the update.
    statements.push(
      db
        .update(question)
        .set({ order: sql`${question.order} + 1000` })
        .where(eq(question.assignmentId, assignmentId)),
    );
  }

  questions.forEach((item, index) => {
    if (!isKept(item)) return;
    statements.push(
      db
        .update(question)
        .set({
          order: index + 1,
          kind: item.kind,
          prompt: item.prompt,
          audio: item.audio?.key ?? existingAudio.get(item.id as number) ?? '',
          points: decimal(item.points),
          explanation: item.explanation.trim(),
          isRequired: item.isRequired,
          updatedAt: now,
        })
        .where(eq(question.id, item.id as number)),
    );
  });

  await runBatch(statements);

  for (const item of questions) {
    if (!isKept(item)) continue;
    await syncChoices(item.id as number, choicesFor(item));
    const previousAudio = existingAudio.get(item.id as number);
    if (item.audio && previousAudio && previousAudio !== item.audio.key) {
      discardedAudio.push(previousAudio);
    }
  }

  // the parked rows sit at 1001 and up, so the new ones can take their final
  // orders straight away
  await insertQuestions(
    assignmentId,
    questions
      .map((item, index) => ({ item, order: index + 1 }))
      .filter(({ item }) => !isKept(item)),
  );
  return discardedAudio;
}

/**
 * Match choices to the stored rows by position, so re-wording an option keeps
 * its id and with it any answer that selected it.
 */
async function syncChoices(
  questionId: number,
  choices: { text: string; isCorrect: boolean }[],
): Promise<void> {
  const existing = await db
    .select({ id: questionChoice.id, order: questionChoice.order })
    .from(questionChoice)
    .where(eq(questionChoice.questionId, questionId))
    .orderBy(questionChoice.order, questionChoice.id);

  const statements: BatchItem[] = [];

  for (const [index, choice] of choices.entries()) {
    const row = existing[index];
    if (!row) continue;
    statements.push(
      db
        .update(questionChoice)
        .set({ order: index + 1, text: choice.text, isCorrect: choice.isCorrect })
        .where(eq(questionChoice.id, row.id)),
    );
  }

  const surplus = existing.slice(choices.length).map((row) => row.id);
  if (surplus.length > 0) {
    statements.push(...detachChoiceStatements(surplus));
    statements.push(db.delete(questionChoice).where(inArray(questionChoice.id, surplus)));
  }

  await runBatch(statements);

  const added = choices.slice(existing.length);
  if (added.length > 0) {
    await db.insert(questionChoice).values(
      added.map((choice, index) => ({
        questionId,
        order: existing.length + index + 1,
        text: choice.text,
        isCorrect: choice.isCorrect,
      })),
    );
  }
}

/** Break the answer references to choices about to be deleted. */
function detachChoiceStatements(choiceIds: number[]) {
  return [
    db
      .delete(submissionAnswerChoice)
      .where(inArray(submissionAnswerChoice.questionChoiceId, choiceIds)),
    db
      .update(submissionAnswer)
      .set({ selectedChoiceId: null, updatedAt: new Date() })
      .where(inArray(submissionAnswer.selectedChoiceId, choiceIds)),
  ];
}

/** Everything that has to go before a question row can be deleted. */
function deleteQuestionStatements(questionIds: number[]) {
  const answerIds = () =>
    db
      .select({ id: submissionAnswer.id })
      .from(submissionAnswer)
      .where(inArray(submissionAnswer.questionId, questionIds));

  return [
    db
      .delete(submissionAnswerChoice)
      .where(inArray(submissionAnswerChoice.submissionAnswerId, answerIds())),
    db.delete(submissionAnswer).where(inArray(submissionAnswer.questionId, questionIds)),
    db
      .update(submissionFile)
      .set({ questionId: null })
      .where(inArray(submissionFile.questionId, questionIds)),
    db.delete(questionChoice).where(inArray(questionChoice.questionId, questionIds)),
    db.delete(question).where(inArray(question.id, questionIds)),
  ];
}

/**
 * Score one attempt.
 *
 * Mirrors `Submission.grade_objective()` and `recalculate_total()`: choice
 * questions are scored from their answer key into `auto_score` by
 * `scoreObjectiveAnswers`, the points the teacher awarded by hand make up
 * `manual_score`, and `total_score` is their sum -- null only when neither side
 * has a value.
 */
export async function gradeSubmission(
  submissionId: number,
  input: GradeSubmissionInput,
  graderId: number | null,
): Promise<MutationResult> {
  const [current] = await db
    .select({ id: submission.id, status: submission.status })
    .from(submission)
    .where(
      and(
        eq(submission.id, submissionId),
        eq(submission.assignmentId, input.assignmentId),
      ),
    )
    .limit(1);

  if (!current) return { error: 'That submission no longer exists.', status: 404 };

  const { answers, marks, autoScore } = await scoreObjectiveAnswers(submissionId);

  const submitted = new Map(input.answers.map((answer) => [answer.answerId, answer]));
  const now = new Date();
  const statements: BatchItem[] = [];

  let manualFromAnswers: number | null = null;

  for (const answer of answers) {
    if (questionHasChoices(answer.kind)) {
      const mark = marks.get(answer.id);
      const awarded = mark?.awardedPoints ?? null;

      statements.push(
        db
          .update(submissionAnswer)
          .set({
            isCorrect: mark?.isCorrect ?? null,
            awardedPoints: awarded === null ? null : decimal(awarded),
            feedback: submitted.get(answer.id)?.feedback.trim() ?? '',
            updatedAt: now,
          })
          .where(eq(submissionAnswer.id, answer.id)),
      );
      continue;
    }

    // graded by hand: only what the teacher entered is trusted
    const entry = submitted.get(answer.id);
    if (!entry) continue;

    if (entry.awardedPoints !== null) {
      manualFromAnswers = (manualFromAnswers ?? 0) + entry.awardedPoints;
    }

    statements.push(
      db
        .update(submissionAnswer)
        .set({
          awardedPoints:
            entry.awardedPoints === null ? null : decimal(entry.awardedPoints),
          feedback: entry.feedback.trim(),
          updatedAt: now,
        })
        .where(eq(submissionAnswer.id, answer.id)),
    );
  }

  const manualScore = input.manualScore ?? manualFromAnswers;
  const totalScore =
    autoScore === null && manualScore === null
      ? null
      : (autoScore ?? 0) + (manualScore ?? 0);
  const isGraded = input.status === 'graded' || input.status === 'returned';

  statements.push(
    db
      .update(submission)
      .set({
        status: input.status,
        feedback: input.feedback.trim(),
        autoScore: autoScore === null ? null : decimal(autoScore),
        manualScore: manualScore === null ? null : decimal(manualScore),
        totalScore: totalScore === null ? null : decimal(totalScore),
        gradedAt: isGraded ? now : null,
        gradedById: isGraded ? graderId : null,
        updatedAt: now,
      })
      .where(eq(submission.id, submissionId)),
  );

  try {
    await runBatch(statements);
  } catch (error) {
    console.error('could not grade submission', error);
    return { error: 'Could not save the marks. Please try again.', status: 500 };
  }

  return {};
}
