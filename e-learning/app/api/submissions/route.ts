import { apiError, readJson } from '@/lib/api';
import { startAttemptSchema } from '@/lib/form-schemas';
import { authorizeStudentRequest } from '@/lib/student-access';
import { startAttempt } from '@/lib/student-submission-mutations';

/** Open an attempt at an assignment, or resume if in progress. */
export async function POST(request: Request) {
  const authorization = await authorizeStudentRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const parsed = startAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('That assignment could not be started.', 400);
  }

  const result = await startAttempt(
    authorization.profile.id,
    authorization.classId,
    parsed.data.assignmentId,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  return Response.json({ submissionId: result.submissionId }, { status: 201 });
}
