import 'server-only';

import { and, eq, isNull, or } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, studentClass, studyMaterial } from '@/db/schema';
import { deleteObject } from '@/lib/b2';
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
} from '@/lib/form-schemas';
import { buildMaterialSlug } from '@/lib/study-materials';

export type MutationResult = { error?: string; status?: number };

export async function classExists(classId: number) {
  const [row] = await db
    .select({ id: studentClass.id })
    .from(studentClass)
    .where(eq(studentClass.id, classId))
    .limit(1);
  return Boolean(row);
}

export async function createMaterial(
  input: CreateMaterialInput,
  userId: number | null,
): Promise<MutationResult> {
  const { file } = input;
  const fail = async (error: string, status = 400): Promise<MutationResult> => {
    if (file) await deleteObject(file.key);
    return { error, status };
  };

  if (!(await classExists(input.classId))) {
    return fail('That class no longer exists.', 404);
  }

  const isWriteUp = input.materialType === 'write_up';
  const now = new Date();

  try {
    await db.insert(studyMaterial).values({
      title: input.title,
      slug: await buildMaterialSlug(input.title),
      description: input.description.trim(),
      materialType: input.materialType,
      content: isWriteUp ? input.content.trim() : '',
      category: input.category,
      level: input.level,
      studentClassId: input.classId,
      file: isWriteUp ? '' : file!.key,
      thumbnail: null,
      originalFilename: isWriteUp ? '' : file!.originalFilename,
      mimeType: isWriteUp ? 'text/plain' : file!.mimeType,
      fileSizeBytes: isWriteUp ? null : file!.size,
      pageCount: null,
      status: input.status,
      publishedAt: input.status === 'published' ? now : null,
      position: 0,
      uploadedAt: now,
      editedAt: now,
      uploadedById: userId,
    });
  } catch (error) {
    console.error('could not create study material', error);
    return fail('Could not save the material. Please try again.', 500);
  }

  return {};
}

export async function updateMaterial(
  input: UpdateMaterialInput,
  materialId: number,
): Promise<MutationResult> {
  const [current] = await db
    .select({
      id: studyMaterial.id,
      title: studyMaterial.title,
      slug: studyMaterial.slug,
      materialType: studyMaterial.materialType,
      file: studyMaterial.file,
      originalFilename: studyMaterial.originalFilename,
      mimeType: studyMaterial.mimeType,
      fileSizeBytes: studyMaterial.fileSizeBytes,
      publishedAt: studyMaterial.publishedAt,
    })
    .from(studyMaterial)
    .where(
      and(
        eq(studyMaterial.id, materialId),
        eq(studyMaterial.studentClassId, input.classId),
      ),
    )
    .limit(1);

  const replacement = input.file;
  const fail = async (error: string, status = 400): Promise<MutationResult> => {
    if (replacement) await deleteObject(replacement.key);
    return { error, status };
  };

  if (!current) return fail('That material no longer exists.', 404);

  const isWriteUp = input.materialType === 'write_up';
  const canKeepCurrentFile =
    Boolean(current.file) && current.materialType === input.materialType;
  if (!isWriteUp && !replacement && !canKeepCurrentFile) {
    return fail('Choose a new file when changing the material type.');
  }

  const now = new Date();
  const nextFile = isWriteUp ? '' : replacement?.key ?? current.file;

  try {
    await db
      .update(studyMaterial)
      .set({
        title: input.title,
        slug:
          input.title === current.title
            ? current.slug
            : await buildMaterialSlug(input.title),
        description: input.description.trim(),
        materialType: input.materialType,
        content: isWriteUp ? input.content.trim() : '',
        category: input.category,
        level: input.level,
        file: nextFile,
        thumbnail: null,
        originalFilename: isWriteUp
          ? ''
          : replacement?.originalFilename ?? current.originalFilename,
        mimeType: isWriteUp
          ? 'text/plain'
          : replacement?.mimeType ?? current.mimeType,
        fileSizeBytes: isWriteUp
          ? null
          : replacement?.size ?? current.fileSizeBytes,
        pageCount: null,
        status: input.status,
        publishedAt:
          input.status === 'published' ? current.publishedAt ?? now : null,
        editedAt: now,
      })
      .where(eq(studyMaterial.id, materialId));
  } catch (error) {
    console.error('could not update study material', error);
    return fail('Could not update the material. Please try again.', 500);
  }

  if (current.file && current.file !== nextFile) {
    await deleteObject(current.file);
  }
  return {};
}

export async function deleteMaterial(
  classId: number,
  materialId: number,
): Promise<MutationResult> {
  const [material] = await db
    .select({ id: studyMaterial.id, file: studyMaterial.file })
    .from(studyMaterial)
    .where(
      and(
        eq(studyMaterial.id, materialId),
        eq(studyMaterial.studentClassId, classId),
      ),
    )
    .limit(1);

  if (!material) return { error: 'That material no longer exists.', status: 404 };

  try {
    // neon-http exposes atomic batches rather than interactive transactions.
    await db.batch([
      db
        .update(assignment)
        .set({ materialId: null, updatedAt: new Date() })
        .where(eq(assignment.materialId, materialId)),
      db.delete(studyMaterial).where(eq(studyMaterial.id, materialId)),
    ]);
  } catch (error) {
    console.error('could not delete study material', error);
    return { error: 'Could not delete the material. Please try again.', status: 500 };
  }

  if (material.file) await deleteObject(material.file);
  return {};
}

export async function linkAssignment(
  classId: number,
  materialId: number,
  assignmentId: number,
): Promise<MutationResult> {
  const [material] = await db
    .select({ id: studyMaterial.id })
    .from(studyMaterial)
    .where(
      and(
        eq(studyMaterial.id, materialId),
        eq(studyMaterial.studentClassId, classId),
      ),
    )
    .limit(1);

  if (!material) return { error: 'That material no longer exists.', status: 404 };

  const updated = await db
    .update(assignment)
    .set({ materialId, updatedAt: new Date() })
    .where(
      and(
        eq(assignment.id, assignmentId),
        or(eq(assignment.studentClassId, classId), isNull(assignment.studentClassId)),
      ),
    )
    .returning({ id: assignment.id });

  if (updated.length === 0) {
    return { error: 'That assignment is not available to this class.', status: 404 };
  }

  return {};
}

export async function unlinkAssignment(
  classId: number,
  materialId: number,
  assignmentId: number,
): Promise<MutationResult> {
  const unlinked = await db
    .update(assignment)
    .set({ materialId: null, updatedAt: new Date() })
    .where(
      and(
        eq(assignment.id, assignmentId),
        eq(assignment.materialId, materialId),
        or(eq(assignment.studentClassId, classId), isNull(assignment.studentClassId)),
      ),
    )
    .returning({ id: assignment.id });

  if (unlinked.length === 0) {
    return { error: 'That assignment link no longer exists.', status: 404 };
  }
  return {};
}
