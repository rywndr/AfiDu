import { revalidatePath } from 'next/cache';

import { apiError, readJson } from '@/lib/api';
import { saveAttemptSchema } from '@/lib/form-schemas';
import { authorizeStudentRequest } from '@/lib/student-access';
import { saveAttempt } from '@/lib/student-submission-mutations';
import { verifySubmissionUploadToken } from '@/lib/upload-token';

/**
 * Save a draft of an attempt, or hand it in.
 */
export async function PATCH(
  request: Request,
  context: RouteContext<'/api/submissions/[id]/attempt'>,
) {
  const authorization = await authorizeStudentRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const parsed = saveAttemptSchema.safeParse(body);
  const submissionId = Number((await context.params).id);
  if (!parsed.success || !Number.isInteger(submissionId) || submissionId <= 0) {
    return apiError(
      'Check your answers and try again.',
      400,
      parsed.success ? undefined : parsed.error.flatten().fieldErrors,
    );
  }

  for (const file of parsed.data.files) {
    const token = verifySubmissionUploadToken(file.uploadToken);
    const valid =
      token &&
      token.submissionId === submissionId &&
      token.key === file.key &&
      token.originalFilename === file.originalFilename &&
      token.mimeType === file.mimeType &&
      token.size === file.size &&
      token.questionId === file.questionId;

    if (!valid) {
      return apiError(
        'An upload has expired. Attach the file again and resubmit.',
        400,
      );
    }
  }

  const result = await saveAttempt(
    authorization.profile.id,
    submissionId,
    parsed.data,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  // the teacher submission lists and the student's own pages both move on
  revalidatePath('/teacher/assignment', 'layout');
  revalidatePath('/student/assignment', 'layout');
  return Response.json({ success: true });
}
