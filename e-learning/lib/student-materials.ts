/**
 * Study material reads for the student module pages.
 *
 * A student sees the published modules a teacher put on their class in
 * `/teacher/module/[classId]`, plus the level-wide ones: materials saved with no
 * `student_class` at all, which go to every student. Django's
 * `StudyMaterial.is_visible_to` narrows those to a matching `level`; this app
 * deliberately does not, so a module meant for the whole centre reaches
 * everybody regardless of the level it was filed under.
 */
import 'server-only';

import { and, asc, desc, eq, inArray, isNull, or } from 'drizzle-orm';

import { db } from '@/db';
import { assignment, studyMaterial } from '@/db/schema';

const PUBLISHED = 'published';

/** A published assignment set on this class that a module is attached to. */
export type StudentMaterialAssignment = {
  id: number;
  title: string;
};

export type StudentMaterial = {
  id: number;
  title: string;
  description: string;
  materialType: string;
  category: string;
  level: string;
  content: string;
  file: string;
  uploadedAt: Date;
  linkedAssignments: StudentMaterialAssignment[];
};

const materialColumns = {
  id: studyMaterial.id,
  title: studyMaterial.title,
  description: studyMaterial.description,
  materialType: studyMaterial.materialType,
  category: studyMaterial.category,
  level: studyMaterial.level,
  content: studyMaterial.content,
  file: studyMaterial.file,
  uploadedAt: studyMaterial.uploadedAt,
};

/** The SQL form of `canStudentReadMaterial`. */
function readableBy(classId: number) {
  return and(
    eq(studyMaterial.status, PUBLISHED),
    or(
      eq(studyMaterial.studentClassId, classId),
      isNull(studyMaterial.studentClassId),
    ),
  );
}

/**
 * Whether a student in `classId` may read `material`. Used where the row is
 * already in hand, so the file route can check one material without repeating
 * the rule.
 */
export function canStudentReadMaterial(
  material: { status: string; studentClassId: number | null },
  classId: number | null,
): boolean {
  return (
    material.status === PUBLISHED &&
    (material.studentClassId === null || material.studentClassId === classId)
  );
}

/**
 * Published modules for one class, in the order the teacher arranged them.
 */
export async function listStudentMaterials(
  classId: number,
): Promise<StudentMaterial[]> {
  const materials = await db
    .select(materialColumns)
    .from(studyMaterial)
    .where(readableBy(classId))
    .orderBy(asc(studyMaterial.position), desc(studyMaterial.uploadedAt));

  if (materials.length === 0) return [];

  const links = await listMaterialAssignments(
    classId,
    materials.map((material) => material.id),
  );

  return materials.map((material) => ({
    ...material,
    linkedAssignments: links.get(material.id) ?? [],
  }));
}

/** One module, or null when it is not this student's to read. */
export async function getStudentMaterial(
  classId: number,
  materialId: number,
): Promise<StudentMaterial | null> {
  const [material] = await db
    .select(materialColumns)
    .from(studyMaterial)
    .where(and(eq(studyMaterial.id, materialId), readableBy(classId)))
    .limit(1);

  if (!material) return null;

  const links = await listMaterialAssignments(classId, [materialId]);
  return { ...material, linkedAssignments: links.get(materialId) ?? [] };
}

/**
 * The assignments each of `materialIds` is attached to, keyed by material.
 *
 * Narrowed to what `listStudentAssignments` would also show, so every link the
 * module pages render opens rather than 404s.
 */
async function listMaterialAssignments(
  classId: number,
  materialIds: number[],
): Promise<Map<number, StudentMaterialAssignment[]>> {
  const rows = await db
    .select({
      materialId: assignment.materialId,
      id: assignment.id,
      title: assignment.title,
    })
    .from(assignment)
    .where(
      and(
        inArray(assignment.materialId, materialIds),
        eq(assignment.studentClassId, classId),
        eq(assignment.status, PUBLISHED),
      ),
    )
    .orderBy(desc(assignment.createdAt));

  const byMaterial = new Map<number, StudentMaterialAssignment[]>();
  for (const { materialId, ...link } of rows) {
    if (materialId === null) continue;
    const existing = byMaterial.get(materialId);
    if (existing) existing.push(link);
    else byMaterial.set(materialId, [link]);
  }
  return byMaterial;
}
