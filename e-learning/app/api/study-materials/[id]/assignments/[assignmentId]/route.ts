import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { classMutationSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { parseRouteUuid } from '@/lib/route-params';
import { unlinkAssignment } from '@/lib/study-material-mutations';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/study-materials/[id]/assignments/[assignmentId]'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = classMutationSchema.safeParse(body);
  const { id, assignmentId } = await context.params;
  const materialId = parseRouteUuid(id);
  const assignmentPublicId = parseRouteUuid(assignmentId);
  if (
    !input.success ||
    materialId === null ||
    assignmentPublicId === null
  ) {
    return apiError('Invalid assignment link request.', 400);
  }

  const result = await unlinkAssignment(
    input.data.classId,
    materialId,
    assignmentPublicId,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath('/teacher/module', 'layout');
  return Response.json({ success: true });
}
