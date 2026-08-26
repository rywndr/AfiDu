import 'server-only';

import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, score, scoreEntry, submission } from '@/db/schema';
import {
  isScoreTarget,
  isSemester,
  isSubjectCategory,
  type ScoreTarget,
  type Semester,
  type SubjectCategory,
} from '@/lib/choices';
import { exerciseSlot, resolvedExerciseCount } from '@/lib/score-config';
import { listScoreConfigs } from '@/lib/score-config-data';

type LinkedSubmission = {
  assignmentId: number;
  studentId: number;
  year: number;
  semester: Semester;
  category: SubjectCategory;
  target: ScoreTarget;
  maxPoints: string;
  totalScore: string | null;
};

async function linkedSubmission(
  submissionId: number,
): Promise<LinkedSubmission | null> {
  const [row] = await db
    .select({
      assignmentId: assignment.id,
      studentId: submission.studentId,
      year: assignment.year,
      semester: assignment.semester,
      category: assignment.category,
      target: assignment.scoreTarget,
      maxPoints: assignment.maxPoints,
      totalScore: submission.totalScore,
    })
    .from(submission)
    .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
    .where(eq(submission.id, submissionId))
    .limit(1);

  if (
    !row ||
    row.year === null ||
    !row.semester ||
    !isSemester(row.semester) ||
    !isSubjectCategory(row.category) ||
    !row.target ||
    !isScoreTarget(row.target)
  ) {
    return null;
  }

  return {
    ...row,
    year: row.year,
    semester: row.semester,
    category: row.category,
    target: row.target,
  };
}

function percentage(totalScore: string, maxPoints: string): string {
  const total = Number(totalScore);
  const maximum = Number(maxPoints);
  if (!Number.isFinite(total) || !Number.isFinite(maximum) || maximum <= 0) {
    return '0.00';
  }
  const value = Math.min(100, Math.max(0, (total / maximum) * 100));
  return value.toFixed(2);
}

async function scoreRow(item: LinkedSubmission): Promise<number> {
  const [row] = await db
    .insert(score)
    .values({
      studentId: item.studentId,
      year: item.year,
      semester: item.semester,
      category: item.category,
      legacyExerciseScores: [],
    })
    .onConflictDoUpdate({
      target: [score.studentId, score.year, score.semester, score.category],
      set: { studentId: item.studentId },
    })
    .returning({ id: score.id });
  return row.id;
}

async function clearTarget(scoreId: number, item: LinkedSubmission): Promise<void> {
  const slot = exerciseSlot(item.target);
  if (slot !== null) {
    await db
      .delete(scoreEntry)
      .where(
        and(
          eq(scoreEntry.scoreId, scoreId),
          eq(scoreEntry.slot, slot),
          eq(scoreEntry.assignmentId, item.assignmentId),
        ),
      );
    return;
  }

  if (item.target === 'mid_term') {
    await db
      .update(score)
      .set({
        midTerm: null,
        midTermSource: 'manual',
        midTermAssignmentId: null,
      })
      .where(eq(score.id, scoreId));
    return;
  }
  await db
    .update(score)
    .set({
      finals: null,
      finalsSource: 'manual',
      finalsAssignmentId: null,
    })
    .where(eq(score.id, scoreId));
}

export async function syncSubmissionScore(submissionId: number): Promise<void> {
  const item = await linkedSubmission(submissionId);
  if (!item) return;

  const slot = exerciseSlot(item.target);
  if (slot !== null) {
    const exerciseCount = resolvedExerciseCount(await listScoreConfigs(), {
      year: item.year,
      semester: item.semester,
      category: item.category,
    });
    if (slot > exerciseCount) {
      throw new Error(
        `Exercise ${slot} is outside the configured ${exerciseCount} exercise fields.`,
      );
    }
  }

  const scoreId = await scoreRow(item);
  if (item.totalScore === null) {
    await clearTarget(scoreId, item);
    return;
  }

  const points = percentage(item.totalScore, item.maxPoints);
  if (slot !== null) {
    const now = new Date();
    await db
      .insert(scoreEntry)
      .values({
        scoreId,
        slot,
        points,
        source: 'assignment',
        assignmentId: item.assignmentId,
        submissionId,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [scoreEntry.scoreId, scoreEntry.slot],
        set: {
          points,
          source: 'assignment',
          assignmentId: item.assignmentId,
          submissionId,
          updatedAt: now,
        },
      });
    return;
  }

  if (item.target === 'mid_term') {
    await db
      .update(score)
      .set({
        midTerm: points,
        midTermSource: 'assignment',
        midTermAssignmentId: item.assignmentId,
      })
      .where(eq(score.id, scoreId));
    return;
  }
  await db
    .update(score)
    .set({
      finals: points,
      finalsSource: 'assignment',
      finalsAssignmentId: item.assignmentId,
    })
    .where(eq(score.id, scoreId));
}
