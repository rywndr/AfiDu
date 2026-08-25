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
import { dashboardPathFor } from '@/lib/roles';

// re-exported so server code keeps getting roles and session helpers from one
// import; the definitions live in `roles.ts` because the login form needs them
export {
  ROLE_STUDENT,
  ROLE_SUPERUSER,
  ROLE_TEACHER,
  dashboardPathFor,
  isStaffRole,
  type Role,
} from '@/lib/roles';

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
