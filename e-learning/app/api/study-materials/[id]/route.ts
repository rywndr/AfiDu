import { revalidatePath } from 'next/cache';

import { apiError, authorizeApiRequest, readJson } from '@/lib/api';
import { classMutationSchema, updateMaterialSchema } from '@/lib/form-schemas';
import { ROLE_SUPERUSER, ROLE_TEACHER } from '@/lib/session';
import { deleteMaterial, updateMaterial } from '@/lib/study-material-mutations';
import { verifyUploadToken } from '@/lib/upload-token';

const STAFF_ROLES = [ROLE_TEACHER, ROLE_SUPERUSER];

export async function PATCH(
  request: Request,
  context: RouteContext<'/api/study-materials/[id]'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const input = updateMaterialSchema.safeParse(body);
  const materialId = Number((await context.params).id);
  if (!input.success || !Number.isInteger(materialId) || materialId <= 0) {
    return apiError(
      'Check the module details and try again.',
      400,
      input.success ? undefined : input.error.flatten().fieldErrors,
    );
  }

  if (input.data.file) {
    const token = verifyUploadToken(input.data.file.uploadToken);
    const validToken =
      token &&
      token.classId === input.data.classId &&
      token.materialType === input.data.materialType &&
      token.key === input.data.file.key &&
      token.originalFilename === input.data.file.originalFilename &&
      token.mimeType === input.data.file.mimeType &&
      token.size === input.data.file.size;

    if (!validToken) {
      return apiError('The upload ticket is invalid or expired. Upload the file again.', 400);
    }
  }

  const result = await updateMaterial(input.data, materialId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/module/${input.data.classId}`);
  revalidatePath('/teacher/module');
  return Response.json({ success: true });
}

export async function DELETE(
  request: Request,
  context: RouteContext<'/api/study-materials/[id]'>,
) {
  const authorization = await authorizeApiRequest(request, STAFF_ROLES);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const classResult = classMutationSchema.safeParse(body);
  const materialId = Number((await context.params).id);
  if (!classResult.success || !Number.isInteger(materialId) || materialId <= 0) {
    return apiError('Invalid material request.', 400);
  }

  const result = await deleteMaterial(classResult.data.classId, materialId);
  if (result.error) return apiError(result.error, result.status ?? 400);

  revalidatePath(`/teacher/module/${classResult.data.classId}`);
  revalidatePath('/teacher/module');
  return Response.json({ success: true });
}
