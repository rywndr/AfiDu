import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db } from '@/db';
import { studyMaterial } from '@/db/schema';
import { isB2Configured, presignDownload } from '@/lib/b2';
import { getSession, isStaffRole } from '@/lib/session';

/**
 * Redirect to a short-lived signed URL for a material's file.
 *
 * The bucket is private, so nothing in the database is a usable URL -- the key
 * has to be signed per request. Staff only for now: giving students access needs
 * the `StudyMaterial.is_visible_to` check (published, matching level or class)
 * rather than a role test.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !isStaffRole(session.user.role)) {
    return new Response('Not found', { status: 404 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return new Response('Not found', { status: 404 });
  }

  const [material] = await db
    .select({
      file: studyMaterial.file,
      originalFilename: studyMaterial.originalFilename,
    })
    .from(studyMaterial)
    .where(eq(studyMaterial.id, id))
    .limit(1);

  if (!material?.file) {
    return new Response('Not found', { status: 404 });
  }
  if (!isB2Configured()) {
    return new Response('File storage is not configured.', { status: 503 });
  }

  const url = await presignDownload(material.file, {
    filename: material.originalFilename || undefined,
    download: request.nextUrl.searchParams.has('download'),
  });

  return new Response(null, {
    status: 307,
    headers: { Location: url, 'Cache-Control': 'no-store' },
  });
}
