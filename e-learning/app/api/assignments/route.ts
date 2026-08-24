import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { createAssignmentSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { createAssignment } from '@/lib/assignment-mutations';
import { isValidQuestionAudioUpload } from '@/lib/upload-token';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = createAssignmentSchema.safeParse(body);
  if (!input.success) {
    return apiError(
      'Check the assignment details and try again.',
      400,
      input.error.flatten().fieldErrors,
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

  const userId = Number(authorization.session.user.id);
  const result = await createAssignment(
    input.data,
    Number.isInteger(userId) ? userId : null,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/assignment/${input.data.classId}`);
  revalidatePath('/teacher/assignment');
  return Response.json({ success: true }, { status: 201 });
}
