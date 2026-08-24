/**
 * Builds the teacher dashboard's recent activity list.
 *
 * Four queries load submission, module, and assignment events. The results are
 * merged and sorted by date. Submission events are grouped by assignment so a
 * batch of submissions produces one row.
 *
 * The list only includes records linked to a class. It cannot include students
 * joining a class because `students_student` has no creation timestamp.
 */
import 'server-only';

import { count, desc, eq, gte, max, sql } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, studentClass, studyMaterial, submission } from '@/db/schema';

/** Number of days included in the activity list and its section heading. */
export const ACTIVITY_WINDOW_DAYS = 7;

/** Maximum rows returned by each query and by the merged list. */
const ACTIVITY_LIMIT = 8;

/** Assignment or module associated with an activity event. */
export type ActivityTarget = {
  id: number;
  title: string;
  classId: number;
  className: string;
};

export type TeacherActivityEvent =
  | { kind: 'submissions_received'; at: Date; count: number; assignment: ActivityTarget }
  | { kind: 'submissions_marked'; at: Date; count: number; assignment: ActivityTarget }
  | { kind: 'assignment_added'; at: Date; assignment: ActivityTarget }
  | { kind: 'module_published'; at: Date; material: ActivityTarget }
  | { kind: 'module_added'; at: Date; material: ActivityTarget };

export type TeacherActivityKind = TeacherActivityEvent['kind'];

/** Returns a stable key for the event type and its target. */
export function activityEventKey(event: TeacherActivityEvent): string {
  const target = 'assignment' in event ? event.assignment : event.material;
  return `${event.kind}-${target.id}`;
}

function windowStart(now: Date): Date {
  return new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * 24 * 3_600_000);
}

/**
 * Groups submissions by assignment and dates each group by its latest matching
 * submission.
 */
async function readSubmissionEvents(
  column: typeof submission.submittedAt | typeof submission.gradedAt,
  since: Date,
): Promise<{ at: Date; count: number; assignment: ActivityTarget }[]> {
  const latest = max(column);

  const rows = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      classId: studentClass.id,
      className: studentClass.name,
      total: count(),
      latest,
    })
    .from(submission)
    .innerJoin(assignment, eq(submission.assignmentId, assignment.id))
    .innerJoin(studentClass, eq(assignment.studentClassId, studentClass.id))
    .where(gte(column, since))
    .groupBy(assignment.id, studentClass.id)
    .orderBy(desc(latest))
    .limit(ACTIVITY_LIMIT);

  return rows.flatMap(({ total, latest: at, ...target }) =>
    // Drizzle types `max` as nullable, but the `gte` filter excludes null dates.
    at === null ? [] : [{ at, count: total, assignment: target }],
  );
}

/**
 * Loads modules uploaded or published during the activity window. A publication
 * date takes precedence over the upload date.
 */
async function readModuleEvents(since: Date): Promise<TeacherActivityEvent[]> {
  const sharedAt = sql<Date>`coalesce(${studyMaterial.publishedAt}, ${studyMaterial.uploadedAt})`.mapWith(
    studyMaterial.uploadedAt,
  );

  const rows = await db
    .select({
      id: studyMaterial.id,
      title: studyMaterial.title,
      classId: studentClass.id,
      className: studentClass.name,
      publishedAt: studyMaterial.publishedAt,
      sharedAt,
    })
    .from(studyMaterial)
    .innerJoin(studentClass, eq(studyMaterial.studentClassId, studentClass.id))
    .where(gte(sharedAt, since))
    .orderBy(desc(sharedAt))
    .limit(ACTIVITY_LIMIT);

  return rows.map(({ publishedAt, sharedAt: at, ...target }) =>
    publishedAt !== null && publishedAt >= since
      ? { kind: 'module_published', at, material: target }
      : { kind: 'module_added', at, material: target },
  );
}

/** Loads assignments created during the window. Assignments have no publish date. */
async function readAssignmentEvents(since: Date): Promise<TeacherActivityEvent[]> {
  const rows = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      classId: studentClass.id,
      className: studentClass.name,
      at: assignment.createdAt,
    })
    .from(assignment)
    .innerJoin(studentClass, eq(assignment.studentClassId, studentClass.id))
    .where(gte(assignment.createdAt, since))
    .orderBy(desc(assignment.createdAt))
    .limit(ACTIVITY_LIMIT);

  return rows.map(({ at, ...target }) => ({
    kind: 'assignment_added',
    at,
    assignment: target,
  }));
}

export async function listRecentActivity(
  now: Date = new Date(),
): Promise<TeacherActivityEvent[]> {
  const since = windowStart(now);

  const [received, marked, modules, assignments] = await Promise.all([
    readSubmissionEvents(submission.submittedAt, since),
    readSubmissionEvents(submission.gradedAt, since),
    readModuleEvents(since),
    readAssignmentEvents(since),
  ]);

  const events: TeacherActivityEvent[] = [
    ...received.map((event) => ({ kind: 'submissions_received' as const, ...event })),
    ...marked.map((event) => ({ kind: 'submissions_marked' as const, ...event })),
    ...modules,
    ...assignments,
  ];

  return events
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, ACTIVITY_LIMIT);
}
