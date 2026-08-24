import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { isB2Configured, presignUpload, questionAudioKey } from '@/lib/b2';
import { validateQuestionAudio } from '@/lib/choices';
import { questionAudioUploadTicketSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { classExists } from '@/lib/study-material-mutations';
import { createQuestionAudioUploadToken } from '@/lib/upload-token';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = questionAudioUploadTicketSchema.safeParse(body);
  if (!parsed.success) return apiError('Check the MP3 and try again.', 400);

  const input = parsed.data;
  if (!isB2Configured()) {
    return apiError('File storage is not configured on this deployment.', 503);
  }
  if (!(await classExists(input.classId))) {
    return apiError('That class no longer exists.', 404);
  }

  const problem = validateQuestionAudio(input.filename, input.size);
  if (problem) return apiError(problem, 400);

  const key = questionAudioKey(input.filename);
  try {
    const url = await presignUpload(key, input.contentType);
    const uploadToken = createQuestionAudioUploadToken({
      classId: input.classId,
      key,
      originalFilename: input.filename,
      mimeType: input.contentType,
      size: input.size,
    });
    return Response.json({ key, url, contentType: input.contentType, uploadToken });
  } catch (error) {
    console.error('could not sign a question audio upload', error);
    return apiError('Could not start the upload. Please try again.', 500);
  }
}
