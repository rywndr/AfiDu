/**
 * Builds the work queue shown on the teacher dashboard.
 *
 * Each assignment appears once. Items are ranked by work type: submissions to
 * mark, overdue assignments, assignments due soon, then recent drafts. If an
 * assignment matches more than one type, the highest-ranked type is used.
 *
 * The schema has no teacher-to-class relation, so the query covers every class,
 * as the assignment and module pages do. It excludes assignments without a
 * class, which the internal Django app manages separately.
 */
import 'server-only';

import { and, count, desc, eq, gte, inArray, lte, or, type SQL } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, studentClass, submission } from '@/db/schema';

/** Submission status for work that still needs marking. */
const AWAITING_GRADING = 'submitted';
const PUBLISHED = 'published';
const DRAFT = 'draft';

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Maximum age of an overdue assignment included in the queue. */
const OVERDUE_WINDOW_DAYS = 14;
/** Maximum time before a due date for inclusion in the queue. */
const DUE_SOON_WINDOW_HOURS = 48;
/** Maximum age of a draft included in the queue. */
const DRAFT_WINDOW_DAYS = 30;
/** Maximum number of queue items shown on the dashboard. */
const STACK_LIMIT = 6;
/**
 * Caps the candidate query before ranking. This prevents large centres from
 * loading every open assignment when the dashboard only displays a few.
 */
const CANDIDATE_LIMIT = 60;

/** Assignment and class shown in a queue item. */
export type StackAssignment = {
  id: number;
  title: string;
  classId: number;
  className: string;
};

export type TeacherStackItem =
  | { kind: 'to_mark'; assignment: StackAssignment; awaitingCount: number }
  | { kind: 'overdue'; assignment: StackAssignment; dueAt: Date; allowLate: boolean }
  | { kind: 'due_soon'; assignment: StackAssignment; dueAt: Date }
  | { kind: 'draft'; assignment: StackAssignment };

export type TeacherStackKind = TeacherStackItem['kind'];

export type TeacherStack = {
  items: TeacherStackItem[];
  /** Number of qualifying items before applying `STACK_LIMIT`. */
  total: number;
};

/** Returns a stable key for an assignment's queue item. */
export function stackItemKey(item: TeacherStackItem): string {
  return `stack-${item.assignment.id}`;
}

/** Sort order applied before comparing items of the same type. */
const KIND_PRIORITY: Record<TeacherStackKind, number> = {
  to_mark: 0,
  overdue: 1,
  due_soon: 2,
  draft: 3,
};

/** Sorts items of the same type by count or due date. */
function tieBreak(item: TeacherStackItem): number {
  switch (item.kind) {
    case 'to_mark':
      return -item.awaitingCount;
    case 'overdue':
      return -item.dueAt.getTime();
    case 'due_soon':
      return item.dueAt.getTime();
    case 'draft':
      return 0;
    default: {
      const exhaustive: never = item;
      return exhaustive;
    }
  }
}

type CandidateRow = {
  id: number;
  title: string;
  status: string;
  dueAt: Date | null;
  allowLate: boolean;
  classId: number;
  className: string;
};

/** Counts unmarked submissions by assignment, without a date cutoff. */
async function readAwaitingCounts(): Promise<Map<number, number>> {
  const rows = await db
    .select({ assignmentId: submission.assignmentId, total: count() })
    .from(submission)
    .where(eq(submission.status, AWAITING_GRADING))
    .groupBy(submission.assignmentId);

  return new Map(rows.map((row) => [row.assignmentId, row.total]));
}

/**
 * Filters assignments that may qualify for the queue. `stackItemFor` separates
 * overdue assignments from those due soon.
 */
function candidateFilter(awaitingIds: number[], now: Date): SQL | undefined {
  const time = now.getTime();
  const reasons: (SQL | undefined)[] = [
    and(
      eq(assignment.status, PUBLISHED),
      gte(assignment.dueAt, new Date(time - OVERDUE_WINDOW_DAYS * DAY_MS)),
      lte(assignment.dueAt, new Date(time + DUE_SOON_WINDOW_HOURS * HOUR_MS)),
    ),
    and(
      eq(assignment.status, DRAFT),
      gte(assignment.createdAt, new Date(time - DRAFT_WINDOW_DAYS * DAY_MS)),
    ),
  ];

  if (awaitingIds.length > 0) {
    reasons.push(inArray(assignment.id, awaitingIds));
  }

  return or(...reasons);
}

/**
 * Selects the highest-priority queue item for an assignment. Returns null if the
 * candidate no longer qualifies.
 */
function stackItemFor(
  row: CandidateRow,
  awaitingCounts: Map<number, number>,
  now: Date,
): TeacherStackItem | null {
  const target: StackAssignment = {
    id: row.id,
    title: row.title,
    classId: row.classId,
    className: row.className,
  };

  const awaitingCount = awaitingCounts.get(row.id) ?? 0;
  if (awaitingCount > 0) {
    return { kind: 'to_mark', assignment: target, awaitingCount };
  }
  if (row.status === DRAFT) {
    return { kind: 'draft', assignment: target };
  }
  if (row.status === PUBLISHED && row.dueAt) {
    return row.dueAt < now
      ? { kind: 'overdue', assignment: target, dueAt: row.dueAt, allowLate: row.allowLate }
      : { kind: 'due_soon', assignment: target, dueAt: row.dueAt };
  }
  return null;
}

/**
 * Accepts the page's clock so classification and rendered timestamps use the
 * same reference time.
 */
export async function listMorningStack(now: Date = new Date()): Promise<TeacherStack> {
  const awaitingCounts = await readAwaitingCounts();

  const rows = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
      dueAt: assignment.dueAt,
      allowLate: assignment.allowLate,
      classId: studentClass.id,
      className: studentClass.name,
    })
    .from(assignment)
    .innerJoin(studentClass, eq(assignment.studentClassId, studentClass.id))
    .where(candidateFilter([...awaitingCounts.keys()], now))
    .orderBy(desc(assignment.createdAt))
    .limit(CANDIDATE_LIMIT);

  const items = rows
    .map((row) => stackItemFor(row, awaitingCounts, now))
    .filter((item): item is TeacherStackItem => item !== null)
    .sort(
      (a, b) =>
        KIND_PRIORITY[a.kind] - KIND_PRIORITY[b.kind] || tieBreak(a) - tieBreak(b),
    );

  return { items: items.slice(0, STACK_LIMIT), total: items.length };
}
