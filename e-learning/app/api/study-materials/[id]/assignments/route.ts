import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { assignmentLinkSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { parseRouteUuid } from '@/lib/route-params';
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
  const materialId = parseRouteUuid((await context.params).id);
  if (!input.success || materialId === null) {
    return apiError('Invalid assignment link request.', 400);
  }

  const result = await linkAssignment(
    input.data.classId,
    materialId,
    input.data.assignmentId,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath('/teacher/module', 'layout');
  return Response.json({ success: true }, { status: 201 });
}
