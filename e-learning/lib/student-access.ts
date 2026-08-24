/**
 * Getting from a student's session to their Student record.
 */
import 'server-only';

import { apiError, authorizeApiRequest } from '@/lib/api';
import { ROLE_STUDENT, getStudentProfile, requireRole } from '@/lib/session';

export type StudentProfile = NonNullable<
  Awaited<ReturnType<typeof getStudentProfile>>
>;

/** The signed-in student's record. Null when they have none. */
export async function requireStudentProfile(): Promise<StudentProfile | null> {
  const { user } = await requireRole([ROLE_STUDENT]);
  return getStudentProfile(user.id);
}

export async function authorizeStudentRequest(request: Request) {
  const authorization = await authorizeApiRequest(request, [ROLE_STUDENT]);
  if (!authorization.ok) return authorization;

  const profile = await getStudentProfile(authorization.session.user.id);
  if (!profile) {
    return {
      ok: false as const,
      response: apiError('This login has no student record.', 403),
    };
  }
  if (profile.classId === null) {
    return {
      ok: false as const,
      response: apiError('You are not assigned to a class yet.', 403),
    };
  }

  return { ok: true as const, profile, classId: profile.classId };
}
