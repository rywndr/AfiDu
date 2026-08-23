import { and, eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db } from '@/db';
import { submissionFile } from '@/db/schema';
import { isB2Configured, presignDownload } from '@/lib/b2';
import { getSession, isStaffRole } from '@/lib/session';

/**
 * Redirect to a short-lived signed URL for one of a submission's uploads.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> },
) {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    return new Response('Not found', { status: 404 });
  }

  const { id, fileId } = await params;
  const submissionId = Number(id);
  const submissionFileId = Number(fileId);
  if (!Number.isInteger(submissionId) || !Number.isInteger(submissionFileId)) {
    return new Response('Not found', { status: 404 });
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
