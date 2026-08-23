import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { classMutationSchema, updateAssignmentSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { deleteAssignment, updateAssignment } from '@/lib/assignment-mutations';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/assignments/[id]'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = updateAssignmentSchema.safeParse(body);
  const assignmentId = Number((await context.params).id);
  if (!input.success || !Number.isInteger(assignmentId) || assignmentId <= 0) {
    return apiError(
      'Check the assignment details and try again.',
      400,
      input.success ? undefined : input.error.flatten().fieldErrors,
    );
  }

  const result = await updateAssignment(input.data, assignmentId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/assignment/${input.data.classId}`);
  revalidatePath(`/teacher/assignment/${input.data.classId}/${assignmentId}`);
  revalidatePath('/teacher/assignment');
  return Response.json({ success: true });
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/assignments/[id]'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const classResult = classMutationSchema.safeParse(body);
  const assignmentId = Number((await context.params).id);
  if (!classResult.success || !Number.isInteger(assignmentId) || assignmentId <= 0) {
    return apiError('Invalid assignment request.', 400);
  }

  const result = await deleteAssignment(classResult.data.classId, assignmentId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/assignment/${classResult.data.classId}`);
  revalidatePath('/teacher/assignment');
  return Response.json({ success: true });
}
