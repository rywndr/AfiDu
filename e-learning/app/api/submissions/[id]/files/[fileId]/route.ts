import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db } from '@/db';
import { question, submissionFile } from '@/db/schema';
import { deleteObject, isB2Configured, presignDownload } from '@/lib/b2';
import { apiError } from '@/lib/api';
import { ROLE_STUDENT, getSession, getStudentProfile, isStaffRole } from '@/lib/session';
import { authorizeStudentRequest } from '@/lib/student-access';
import { getOpenAttempt, ownsSubmission } from '@/lib/student-attempts';

/**
 * Redirect to a short-lived signed URL for one of a submission's uploads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const session = await getSession();
  const role = session?.user.role;
  if (!session || !(isStaffRole(role) || role === ROLE_STUDENT)) {
    return new Response('Not found', { status: 404 });
  }

  const { id, fileId } = await params;
  const submissionId = Number(id);
  const submissionFileId = Number(fileId);
  if (!Number.isInteger(submissionId) || !Number.isInteger(submissionFileId)) {
    return new Response('Not found', { status: 404 });
  }

  if (!isStaffRole(role)) {
    const profile = await getStudentProfile(session.user.id);
    if (!profile || !(await ownsSubmission(profile.id, submissionId))) {
      return new Response('Not found', { status: 404 });
    }
  }

  const [file] = await db
    .select({
      file: submissionFile.file,
      originalFilename: submissionFile.originalFilename,
    })
    .from(submissionFile)
    .where(
      and(
        eq(submissionFile.id, submissionFileId),
        eq(submissionFile.submissionId, submissionId),
      ),
    )
    .limit(1);

  if (!file?.file) {
    return new Response('Not found', { status: 404 });
  }
  if (!isB2Configured()) {
    return new Response('File storage is not configured.', { status: 503 });
  }

  const url = await presignDownload(file.file, {
    filename: file.originalFilename || undefined,
    download: request.nextUrl.searchParams.has('download'),
  });

  return new Response(null, {
    status: 307,
    headers: { Location: url, 'Cache-Control': 'no-store' },
  });
}

/** Delete a saved recording while its attempt is still open. */
export async function DELETE(
  request: Request,
  context: RouteContext<'/api/submissions/[id]/files/[fileId]'>,
) {
  const authorization = await authorizeStudentRequest(request);
  if (!authorization.ok) return authorization.response;

  const { id, fileId } = await context.params;
  const submissionId = Number(id);
  const submissionFileId = Number(fileId);
  if (!Number.isInteger(submissionId) || !Number.isInteger(submissionFileId)) {
    return apiError('That recording could not be removed.', 400);
  }

  if (!(await getOpenAttempt(authorization.profile.id, submissionId))) {
    return apiError('That attempt is no longer open.', 409);
  }

  const [file] = await db
    .select({ id: submissionFile.id, key: submissionFile.file })
    .from(submissionFile)
    .innerJoin(question, eq(submissionFile.questionId, question.id))
    .where(
      and(
        eq(submissionFile.id, submissionFileId),
        eq(submissionFile.submissionId, submissionId),
        eq(question.kind, 'audio_recording'),
      ),
    )
    .limit(1);
  if (!file) return apiError('That recording no longer exists.', 404);

  await db.delete(submissionFile).where(eq(submissionFile.id, file.id));
  await deleteObject(file.key);
  return Response.json({ success: true });
}
