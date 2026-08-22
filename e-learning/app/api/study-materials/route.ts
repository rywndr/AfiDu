import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { createMaterialSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { createMaterial } from '@/lib/study-material-mutations';
import { verifyUploadToken } from '@/lib/upload-token';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function POST(request: Request) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const parsed = createMaterialSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Check the module details and try again.', 400, parsed.error.flatten().fieldErrors);
  }

  const input = parsed.data;
  if (input.file) {
    const token = verifyUploadToken(input.file.uploadToken);
    const validToken =
      token &&
      token.classId === input.classId &&
      token.materialType === input.materialType &&
      token.key === input.file.key &&
      token.originalFilename === input.file.originalFilename &&
      token.mimeType === input.file.mimeType &&
      token.size === input.file.size;

    if (!validToken) {
      return apiError('The upload ticket is invalid or expired. Upload the file again.', 400);
    }
  }

  const userId = Number(authorization.session.user.id);
  const result = await createMaterial(
    input,
    Number.isInteger(userId) ? userId : null,
  );
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/module/${input.classId}`);
  revalidatePath('/teacher/module');
  return Response.json({ success: true }, { status: 201 });
}
