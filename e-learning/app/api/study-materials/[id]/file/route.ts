import { eq } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { db } from '@/db';
import { studyMaterial } from '@/db/schema';
import { isB2Configured, presignDownload } from '@/lib/b2';
import {
  ROLE_STUDENT,
  getSession,
  getStudentProfile,
  isStaffRole,
} from '@/lib/session';
import { canStudentReadMaterial } from '@/lib/student-materials';

/**
 * Staff can see any material, while a student can only view published ones their class was given
 */
async function mayRead(
  user: { id: number | string; role?: string | null },
  material: { status: string; studentClassId: number | null },
): Promise<boolean> {
  if (isStaffRole(user.role)) return true;
  if (user.role !== ROLE_STUDENT) return false;

  const profile = await getStudentProfile(user.id);
  return profile !== null && canStudentReadMaterial(material, profile.classId);
}

/**
 * Redirect to a short-lived signed URL for a material's file.
 *
 * The bucket is private, so nothing in the database is a usable URL -- the key
 * has to be signed per request. A material somebody may not read answers 404
 * rather than 403, so the route never confirms that an id exists.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
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
      status: studyMaterial.status,
      studentClassId: studyMaterial.studentClassId,
    })
    .from(studyMaterial)
    .where(eq(studyMaterial.id, id))
    .limit(1);

  if (!material?.file || !(await mayRead(session.user, material))) {
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
