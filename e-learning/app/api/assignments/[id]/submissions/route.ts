import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { resetSubmissionsSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { resetStudentSubmissions } from '@/lib/assignment-mutations';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

/** Clear one student's attempts at this assignment so they can start again. */
export async function DELETE(
  request: Request,
  context: RouteContext<'/api/assignments/[id]/submissions'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = resetSubmissionsSchema.safeParse(body);
  const assignmentId = Number((await context.params).id);
  if (!input.success || !Number.isInteger(assignmentId) || assignmentId <= 0) {
    return apiError('Invalid reset request.', 400);
  }

  const result = await resetStudentSubmissions(
    input.data.classId,
    assignmentId,
    input.data.studentId,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  // submission counts and scores show on the class and assignment pages too
  revalidatePath('/teacher/assignment', 'layout');
  return Response.json({ success: true });
}
