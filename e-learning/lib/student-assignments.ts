/**
 * Assignment reads for the student pages.
 */
import 'server-only';

import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm';

import { db } from '@/db';
import {
  assignment,
  question,
  questionChoice,
  studyMaterial,
  submission,
} from '@/db/schema';
import { isB2Configured, presignDownload } from '@/lib/b2';
import { isQuestionKind, type QuestionKind } from '@/lib/choices';

const PUBLISHED = 'published';

/** The newest attempt a student has on an assignment. */
export type LatestAttempt = {
  id: number;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  submittedAt: Date | null;
  gradedAt: Date | null;
  totalScore: string | null;
  isLate: boolean;
};

export type StudentAssignment = {
  id: number;
  title: string;
  description: string;
  category: string;
  level: string;
  status: string;
  openAt: Date | null;
  dueAt: Date | null;
  allowLate: boolean;
  allowFileUpload: boolean;
  autoGrade: boolean;
  shuffleQuestions: boolean;
  revealAnswersAfterSubmit: boolean;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  maxPoints: string;
  materialId: number | null;
  materialTitle: string | null;
  questionCount: number;
  attemptsUsed: number;
  latestAttempt: LatestAttempt | null;
};

/** An option as the student sees it. */
export type StudentChoice = {
  id: number;
  order: number;
  text: string;
  isCorrect: boolean | null;
};

export type StudentQuestion = {
  id: number;
  order: number;
  kind: QuestionKind;
  prompt: string;
  points: string;
  explanation: string;
  isRequired: boolean;
  audioUrl: string | null;
  choices: StudentChoice[];
};

const assignmentColumns = {
  id: assignment.id,
  title: assignment.title,
  description: assignment.description,
  category: assignment.category,
  level: assignment.level,
  status: assignment.status,
  openAt: assignment.openAt,
  dueAt: assignment.dueAt,
  allowLate: assignment.allowLate,
  allowFileUpload: assignment.allowFileUpload,
  autoGrade: assignment.autoGrade,
  shuffleQuestions: assignment.shuffleQuestions,
  revealAnswersAfterSubmit: assignment.revealAnswersAfterSubmit,
  timeLimitMinutes: assignment.timeLimitMinutes,
  maxAttempts: assignment.maxAttempts,
  maxPoints: assignment.maxPoints,
  materialId: assignment.materialId,
  materialTitle: studyMaterial.title,
};

/** Published assignments for one class, soonest due first. */
export async function listStudentAssignments(
  studentId: number,
  classId: number,
): Promise<StudentAssignment[]> {
  const rows = await db
    .select(assignmentColumns)
    .from(assignment)
    .leftJoin(studyMaterial, eq(assignment.materialId, studyMaterial.id))
    .where(
      and(eq(assignment.studentClassId, classId), eq(assignment.status, PUBLISHED)),
    )
    .orderBy(sql`${assignment.dueAt} asc nulls last`, desc(assignment.createdAt));

  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const [questionCounts, attempts] = await Promise.all([
    db
      .select({ assignmentId: question.assignmentId, total: count() })
      .from(question)
      .where(inArray(question.assignmentId, ids))
      .groupBy(question.assignmentId),
    listAttempts(studentId, ids),
  ]);

  const questions = new Map(questionCounts.map((row) => [row.assignmentId, row.total]));

  return rows.map((row) => ({
    ...row,
    questionCount: questions.get(row.id) ?? 0,
    attemptsUsed: attempts.get(row.id)?.used ?? 0,
    latestAttempt: attempts.get(row.id)?.latest ?? null,
  }));
}

/** One assignment, or null when it is not this student's to see. */
export async function getStudentAssignment(
  studentId: number,
  classId: number,
  assignmentId: number,
): Promise<StudentAssignment | null> {
  const [row] = await db
    .select(assignmentColumns)
    .from(assignment)
    .leftJoin(studyMaterial, eq(assignment.materialId, studyMaterial.id))
    .where(
      and(
        eq(assignment.id, assignmentId),
        eq(assignment.studentClassId, classId),
        eq(assignment.status, PUBLISHED),
      ),
    )
    .limit(1);

  if (!row) return null;

  const [questionCounts, attempts] = await Promise.all([
    db
      .select({ total: count() })
      .from(question)
      .where(eq(question.assignmentId, assignmentId)),
    listAttempts(studentId, [assignmentId]),
  ]);

  return {
    ...row,
    questionCount: questionCounts[0]?.total ?? 0,
    attemptsUsed: attempts.get(assignmentId)?.used ?? 0,
    latestAttempt: attempts.get(assignmentId)?.latest ?? null,
  };
}

/**
 * The questions of an assignment in stored order.
 */
export async function listStudentQuestions(
  assignmentId: number,
  { revealKey = false }: { revealKey?: boolean } = {},
): Promise<StudentQuestion[]> {
  const rows = await db
    .select({
      id: question.id,
      order: question.order,
      kind: question.kind,
      prompt: question.prompt,
      audio: question.audio,
      points: question.points,
      explanation: question.explanation,
      isRequired: question.isRequired,
    })
    .from(question)
    .where(eq(question.assignmentId, assignmentId))
    .orderBy(asc(question.order), asc(question.id));

  if (rows.length === 0) return [];

  const choices = await db
    .select({
      id: questionChoice.id,
      questionId: questionChoice.questionId,
      order: questionChoice.order,
      text: questionChoice.text,
      isCorrect: questionChoice.isCorrect,
    })
    .from(questionChoice)
    .where(
      inArray(
        questionChoice.questionId,
        rows.map((row) => row.id),
      ),
    )
    .orderBy(asc(questionChoice.order), asc(questionChoice.id));

  const byQuestion = new Map<number, StudentChoice[]>();
  for (const { questionId, isCorrect, ...choice } of choices) {
    const entry = { ...choice, isCorrect: revealKey ? isCorrect : null };
    const existing = byQuestion.get(questionId);
    if (existing) existing.push(entry);
    else byQuestion.set(questionId, [entry]);
  }

  const storageReady = isB2Configured();
  return Promise.all(
    rows.map(async ({ audio, ...row }) => ({
      ...row,
      // a kind only Django knows about would leave the student with no control to
      // answer with, so it degrades to a text box
      kind: isQuestionKind(row.kind) ? row.kind : 'short_text',
      explanation: revealKey ? row.explanation : '',
      audioUrl:
        audio && storageReady ? await presignDownload(audio) : null,
      choices: byQuestion.get(row.id) ?? [],
    })),
  );
}

/** How many attempts a student has on each assignment, and the newest one. */
async function listAttempts(studentId: number, assignmentIds: number[]) {
  const rows = await db
    .select({
      id: submission.id,
      assignmentId: submission.assignmentId,
      attemptNumber: submission.attemptNumber,
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      gradedAt: submission.gradedAt,
      totalScore: submission.totalScore,
      isLate: submission.isLate,
    })
    .from(submission)
    .where(
      and(
        eq(submission.studentId, studentId),
        inArray(submission.assignmentId, assignmentIds),
      ),
    )
    .orderBy(asc(submission.assignmentId), desc(submission.attemptNumber));

  const attempts = new Map<number, { used: number; latest: LatestAttempt }>();
  for (const { assignmentId, ...latest } of rows) {
    const existing = attempts.get(assignmentId);
    // ordered by attempt descending, so the first row per assignment is newest
    if (existing) existing.used += 1;
    else attempts.set(assignmentId, { used: 1, latest });
  }
  return attempts;
}
