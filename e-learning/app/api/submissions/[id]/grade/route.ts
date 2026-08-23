import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { gradeSubmissionSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { gradeSubmission } from '@/lib/assignment-mutations';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/submissions/[id]/grade'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = gradeSubmissionSchema.safeParse(body);
  const submissionId = Number((await context.params).id);
  if (!input.success || !Number.isInteger(submissionId) || submissionId <= 0) {
    return apiError(
      'Check the marks and try again.',
      400,
      input.success ? undefined : input.error.flatten().fieldErrors,
    );
  }

  const userId = Number(authorization.session.user.id);
  const result = await gradeSubmission(
    submissionId,
    input.data,
    Number.isInteger(userId) ? userId : null,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  // the assignment and class pages both show submission counts and scores
  revalidatePath('/teacher/assignment', 'layout');
  return Response.json({ success: true });
}
