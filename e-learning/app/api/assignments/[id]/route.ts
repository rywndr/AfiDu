import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { classMutationSchema, updateAssignmentSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { deleteAssignment, updateAssignment } from '@/lib/assignment-mutations';
import { parseRouteUuid } from '@/lib/route-params';
import { isValidQuestionAudioUpload } from '@/lib/upload-token';

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
  const assignmentId = parseRouteUuid((await context.params).id);
  if (!input.success || assignmentId === null) {
    return apiError(
      'Check the assignment details and try again.',
      400,
      input.success ? undefined : input.error.flatten().fieldErrors,
    );
  }

  if (
    input.data.questions.some(
      (question) =>
        question.audio &&
        !isValidQuestionAudioUpload(question.audio, input.data.classId),
    )
  ) {
    return apiError('An MP3 upload is invalid or expired. Upload it again.', 400);
  }

  const result = await updateAssignment(input.data, assignmentId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath('/teacher/assignment', 'layout');
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
  const assignmentId = parseRouteUuid((await context.params).id);
  if (!classResult.success || assignmentId === null) {
    return apiError('Invalid assignment request.', 400);
  }

  const result = await deleteAssignment(classResult.data.classId, assignmentId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath('/teacher/assignment', 'layout');
  return Response.json({ success: true });
}
