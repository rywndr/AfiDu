import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { assignmentLinkSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { linkAssignment } from '@/lib/study-material-mutations';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function POST(
  request: Request,
  context: RouteContext<'/api/study-materials/[id]/assignments'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = assignmentLinkSchema.safeParse(body);
  const materialId = Number((await context.params).id);
  if (!input.success || !Number.isInteger(materialId) || materialId <= 0) {
    return apiError('Invalid assignment link request.', 400);
  }

  const result = await linkAssignment(
    input.data.classId,
    materialId,
    input.data.assignmentId,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/module/${input.data.classId}`);
  return Response.json({ success: true }, { status: 201 });
}
