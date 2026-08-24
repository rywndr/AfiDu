import { apiError, readJson } from '@/lib/api';
import { and, eq } from 'drizzle-orm';

import { db } from '@/db';
import { question } from '@/db/schema';
import {
  deleteObject,
  isB2Configured,
  presignUpload,
  submissionFileKey,
} from '@/lib/b2';
import { validateSubmissionUpload } from '@/lib/choices';
import {
  deletePendingSubmissionFileSchema,
  submissionUploadTicketSchema,
} from '@/lib/form-schemas';
import { authorizeStudentRequest } from '@/lib/student-access';
import { getOpenAttempt } from '@/lib/student-attempts';
import {
  createSubmissionUploadToken,
  verifySubmissionUploadToken,
} from '@/lib/upload-token';

/**
 * Sign a direct-to-B2 PUT for a file a student is handing in.
 */
export async function POST(
  request: Request,
  context: RouteContext<'/api/submissions/[id]/upload-ticket'>,
) {
  const authorization = await authorizeStudentRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;

  const parsed = submissionUploadTicketSchema.safeParse(body);
  const submissionId = Number((await context.params).id);
  if (!parsed.success || !Number.isInteger(submissionId) || submissionId <= 0) {
    return apiError('Check the file and try again.', 400);
  }

  const attempt = await getOpenAttempt(authorization.profile.id, submissionId);
  if (!attempt) {
    return apiError('That attempt is not open for uploads.', 404);
  }
  if (!isB2Configured()) {
    return apiError('File storage is not configured on this deployment.', 503);
  }

  const input = parsed.data;
  if (input.questionId !== null) {
    const [recordingQuestion] = await db
      .select({ id: question.id })
      .from(question)
      .where(
        and(
          eq(question.id, input.questionId),
          eq(question.assignmentId, attempt.assignmentId),
          eq(question.kind, 'audio_recording'),
        ),
      )
      .limit(1);
    if (!recordingQuestion) {
      return apiError('That recording question is not available.', 400);
    }
  }

  const problem = validateSubmissionUpload(input.filename, input.size);
  if (problem) return apiError(problem, 400);

  const key = submissionFileKey(input.filename);
  try {
    const url = await presignUpload(key, input.contentType);
    const uploadToken = createSubmissionUploadToken({
      submissionId,
      key,
      originalFilename: input.filename,
      mimeType: input.contentType,
      size: input.size,
      questionId: input.questionId,
    });
    return Response.json({ key, url, contentType: input.contentType, uploadToken });
  } catch (error) {
    console.error('could not sign a submission upload', error);
    return apiError('Could not start the upload. Please try again.', 500);
  }
}

/** Remove an upload that the student has not saved to the attempt. */
export async function DELETE(
  request: Request,
  context: RouteContext<'/api/submissions/[id]/upload-ticket'>,
) {
  const authorization = await authorizeStudentRequest(request);
  if (!authorization.ok) return authorization.response;

  const body = await readJson(request);
  if (body instanceof Response) return body;
  const parsed = deletePendingSubmissionFileSchema.safeParse(body);
  const submissionId = Number((await context.params).id);
  if (!parsed.success || !Number.isInteger(submissionId) || submissionId <= 0) {
    return apiError('That recording could not be removed.', 400);
  }

  const attempt = await getOpenAttempt(authorization.profile.id, submissionId);
  if (!attempt) return apiError('That attempt is no longer open.', 409);

  const file = parsed.data;
  const token = verifySubmissionUploadToken(file.uploadToken);
  const valid =
    token &&
    token.submissionId === submissionId &&
    token.key === file.key &&
    token.originalFilename === file.originalFilename &&
    token.mimeType === file.mimeType &&
    token.size === file.size &&
    token.questionId === file.questionId;
  if (!valid) return apiError('That upload has expired.', 400);

  await deleteObject(file.key);
  return Response.json({ success: true });
}
