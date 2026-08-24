/**
 * Server-side session access.
 *
 * `proxy.ts` only does a cheap cookie check; these are the real checks, done
 * against the database as close to the data as possible.
 */
import 'server-only';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { db } from '@/db';
import { student, studentClass } from '@/db/schema';
import { auth } from '@/lib/auth';

export const ROLE_TEACHER = 'teacher';
export const ROLE_SUPERUSER = 'superuser';
export const ROLE_STUDENT = 'student';

export type Role =
  | typeof ROLE_TEACHER
  | typeof ROLE_SUPERUSER
  | typeof ROLE_STUDENT;

/** Where each role lands after signing in. */
export function dashboardPathFor(role: string | null | undefined): string {
  return role === ROLE_STUDENT ? '/student' : '/teacher';
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === ROLE_TEACHER || role === ROLE_SUPERUSER;
}

/**
 * Memoised for the duration of one render pass, so a layout and its page do not
 * each hit the database.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Redirects to the login page when there is no valid session. */
export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Require a signed-in user in one of `roles`. A signed-in user with the wrong
 * role is sent to their own dashboard rather than the login page, which would
 * otherwise bounce them straight back here.
 */
export async function requireRole(roles: readonly string[]) {
  const session = await requireSession();
  const role = session.user.role;

  if (!roles.includes(role ?? '')) {
    redirect(dashboardPathFor(role));
  }

  return session;
}

/**
 * The Student record behind a student login, plus its class. Memoised per render
 * pass so a layout and its page share one query.
 */
export const getStudentProfile = cache(async (userId: number | string) => {
  const id = typeof userId === 'string' ? Number.parseInt(userId, 10) : userId;
  if (!Number.isInteger(id)) return null;

  const rows = await db
    .select({
      id: student.id,
      name: student.name,
      level: student.level,
      classId: student.assignedClassId,
      className: studentClass.name,
    })
    .from(student)
    .leftJoin(studentClass, eq(student.assignedClassId, studentClass.id))
    .where(eq(student.userId, id))
    .limit(1);

  return rows[0] ?? null;
});
