import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { isB2Configured, presignUpload, studyMaterialKey } from '@/lib/b2';
import { validateUpload } from '@/lib/choices';
import { uploadTicketSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { classExists } from '@/lib/study-material-mutations';
import { createUploadToken } from '@/lib/upload-token';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const parsed = uploadTicketSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Check the upload details and try again.', 400, parsed.error.flatten().fieldErrors);
  }

  const input = parsed.data;
  if (!isB2Configured()) {
    return apiError('File storage is not configured on this deployment.', 503);
  }
  if (!(await classExists(input.classId))) {
    return apiError('That class no longer exists.', 404);
  }

  const problem = validateUpload(input.materialType, input.filename, input.size);
  if (problem) return apiError(problem, 400);

  const key = studyMaterialKey(input.filename);
  try {
    const url = await presignUpload(key, input.contentType);
    const uploadToken = createUploadToken({
      classId: input.classId,
      materialType: input.materialType,
      key,
      originalFilename: input.filename,
      mimeType: input.contentType,
      size: input.size,
    });
    return Response.json({ key, url, contentType: input.contentType, uploadToken });
  } catch (error) {
    console.error('could not sign a B2 upload', error);
    return apiError('Could not start the upload. Please try again.', 500);
  }
}
