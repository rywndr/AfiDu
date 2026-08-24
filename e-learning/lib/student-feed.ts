/**
 * The student dashboard feed.
 *
 * Modules and assignments for one class in a single list, newest upload first,
 * so a module and the assignment written against it sit next to each other
 * instead of on two separate pages.
 *
 * The dashboard shows the whole feed at once, with no paging. Both sources are
 * read at the `MAX_PAGE_SIZE` ceiling, so a class past the newest 50 of either
 * kind keeps the rest on the module and assignment pages, which search and page.
 */
import 'server-only';

import { MAX_PAGE_SIZE } from '@/lib/list-query';
import {
  listStudentAssignments,
  type StudentAssignment,
} from '@/lib/student-assignments';
import { listStudentMaterials, type StudentMaterial } from '@/lib/student-materials';

/** One row of the feed. `postedAt` is the date the merge sorts on. */
export type StudentFeedItem =
  | { kind: 'module'; postedAt: Date; material: StudentMaterial }
  | { kind: 'assignment'; postedAt: Date; assignment: StudentAssignment };

export type StudentFeedQuery = {
  studentId: number;
  classId: number;
};

export type StudentFeed = {
  items: StudentFeedItem[];
  /** Modules readable by the class, counted whole rather than as read. */
  moduleTotal: number;
  assignmentTotal: number;
  /** Assignments with no attempt yet, or one still open. */
  outstanding: number;
};

/** Stable list key. The two kinds have their own id sequences. */
export function feedItemKey(item: StudentFeedItem): string {
  return item.kind === 'module'
    ? `module-${item.material.id}`
    : `assignment-${item.assignment.id}`;
}

export async function listStudentFeed({
  studentId,
  classId,
}: StudentFeedQuery): Promise<StudentFeed> {
  const source = { order: 'newest', pageSize: MAX_PAGE_SIZE } as const;

  const [modules, assignments] = await Promise.all([
    listStudentMaterials({ classId, ...source }),
    listStudentAssignments({ studentId, classId, ...source }),
  ]);

  const items: StudentFeedItem[] = [
    ...modules.items.map((material) => ({
      kind: 'module' as const,
      postedAt: material.uploadedAt,
      material,
    })),
    ...assignments.items.map((item) => ({
      kind: 'assignment' as const,
      postedAt: item.createdAt,
      assignment: item,
    })),
  ].sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime());

  return {
    items,
    moduleTotal: modules.allTotal,
    assignmentTotal: assignments.allTotal,
    outstanding: assignments.outstanding,
  };
}
