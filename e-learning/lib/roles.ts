/**
 * Roles and the routing that follows from them.
 *
 * Split out of `session.ts` because that module is `server-only`, the login form
 * runs in the browser and still has to work out where to send someone once
 * better-auth hands back their role. `session.ts` re-exports all of this, so
 * server code can keep importing it from there.
 */
export const ROLE_TEACHER = 'teacher';
export const ROLE_SUPERUSER = 'superuser';
export const ROLE_STUDENT = 'student';

export type Role =
  | typeof ROLE_TEACHER
  | typeof ROLE_SUPERUSER
  | typeof ROLE_STUDENT;

export function dashboardPathFor(role: string | null | undefined): string {
  return role === ROLE_STUDENT ? '/student' : '/teacher';
}

export function isStaffRole(role: string | null | undefined): boolean {
  return role === ROLE_TEACHER || role === ROLE_SUPERUSER;
}
