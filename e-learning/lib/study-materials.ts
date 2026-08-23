/**
 * Study material reads for the teacher module pages.
 *
 * Everything here is server-only and staff-facing. Django owns these tables, so
 * writes done from this app have to reproduce what `StudyMaterial.save()` does
 * (slug, `published_at`, the file metadata columns) -- see `buildMaterialSlug`
 * and the mutation service in `lib/study-material-mutations.ts`.
 */
import 'server-only';

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
} from 'drizzle-orm';

import { db } from '@/db';
import {
  assignment,
  student,
  studentClass,
  studyMaterial,
  user,
} from '@/db/schema';
import {
  isLevel,
  isMaterialStatus,
  isMaterialType,
  isSubjectCategory,
  type Level,
  type MaterialStatus,
  type MaterialType,
  type SubjectCategory,
} from '@/lib/choices';

export type ClassSummary = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  studentCount: number;
  materialCount: number;
};

export type MaterialSummary = {
  id: number;
  title: string;
  slug: string;
  description: string;
  materialType: string;
  category: string;
  level: string;
  status: string;
  file: string;
  originalFilename: string;
  fileSizeBytes: number | null;
  uploadedAt: Date;
  uploaderName: string | null;
  linkedAssignments: LinkedAssignment[];
};

export type MaterialPage = {
  items: MaterialSummary[];
  total: number;
  allTotal: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type EditableMaterial = {
  id: number;
  title: string;
  description: string;
  materialType: MaterialType;
  category: SubjectCategory;
  level: Level;
  status: MaterialStatus;
  content: string;
  file: string;
  originalFilename: string;
  fileSizeBytes: number | null;
};

export type LinkedAssignment = {
  id: number;
  title: string;
  status: string;
};

export type LinkableAssignment = LinkedAssignment & {
  classScoped: boolean;
  materialId: number | null;
};

/** Every class, with the two counts the class cards show. */
export async function listClasses(): Promise<ClassSummary[]> {
  const [classes, studentCounts, materialCounts] = await Promise.all([
    db
      .select({
        id: studentClass.id,
        name: studentClass.name,
        startTime: studentClass.startTime,
        endTime: studentClass.endTime,
        days: studentClass.days,
      })
      .from(studentClass)
      .orderBy(asc(studentClass.name)),
    db
      .select({ classId: student.assignedClassId, total: count() })
      .from(student)
      .groupBy(student.assignedClassId),
    db
      .select({ classId: studyMaterial.studentClassId, total: count() })
      .from(studyMaterial)
      .groupBy(studyMaterial.studentClassId),
  ]);

  const students = new Map(studentCounts.map((row) => [row.classId, row.total]));
  const materials = new Map(materialCounts.map((row) => [row.classId, row.total]));

  return classes.map((row) => ({
    ...row,
    days: row.days ?? [],
    studentCount: students.get(row.id) ?? 0,
    materialCount: materials.get(row.id) ?? 0,
  }));
}

/**
 * A single class plus the level most of its students sit at, which is only used
 * to preselect the level on the upload form -- `StudentClass` has no level of
 * its own, but `StudyMaterial.level` is NOT NULL.
 */
export async function getClassDetail(classId: number) {
  const [classRow] = await db
    .select({
      id: studentClass.id,
      name: studentClass.name,
      description: studentClass.description,
      startTime: studentClass.startTime,
      endTime: studentClass.endTime,
      days: studentClass.days,
    })
    .from(studentClass)
    .where(eq(studentClass.id, classId))
    .limit(1);

  if (!classRow) return null;

  const [commonLevel] = await db
    .select({ level: student.level, total: count() })
    .from(student)
    .where(eq(student.assignedClassId, classId))
    .groupBy(student.level)
    .orderBy(desc(count()))
    .limit(1);

  return {
    ...classRow,
    days: classRow.days ?? [],
    suggestedLevel: commonLevel?.level ?? null,
  };
}

/** Materials targeted at one class, newest first, with their linked assignments. */
export async function listClassMaterials(
  classId: number,
  options: {
    query?: string;
    category?: SubjectCategory;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<MaterialPage> {
  const query = options.query?.trim().slice(0, 100) ?? '';
  const pageSize = Math.min(Math.max(options.pageSize ?? 6, 1), 50);
  const requestedPage = Math.max(options.page ?? 1, 1);
  const filters = [eq(studyMaterial.studentClassId, classId)];

  if (query) {
    const escapedQuery = query.replace(/[\\%_]/g, '\\$&');
    const pattern = `%${escapedQuery}%`;
    filters.push(
      or(
        ilike(studyMaterial.title, pattern),
        ilike(studyMaterial.description, pattern),
        ilike(studyMaterial.originalFilename, pattern),
      )!,
    );
  }
  if (options.category) {
    filters.push(eq(studyMaterial.category, options.category));
  }

  const where = and(...filters);
  const [[filteredCount], [classCount]] = await Promise.all([
    db.select({ total: count() }).from(studyMaterial).where(where),
    db
      .select({ total: count() })
      .from(studyMaterial)
      .where(eq(studyMaterial.studentClassId, classId)),
  ]);
  const total = filteredCount?.total ?? 0;
  const allTotal = classCount?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const materials = await db
    .select({
      id: studyMaterial.id,
      title: studyMaterial.title,
      slug: studyMaterial.slug,
      description: studyMaterial.description,
      materialType: studyMaterial.materialType,
      category: studyMaterial.category,
      level: studyMaterial.level,
      status: studyMaterial.status,
      file: studyMaterial.file,
      originalFilename: studyMaterial.originalFilename,
      fileSizeBytes: studyMaterial.fileSizeBytes,
      uploadedAt: studyMaterial.uploadedAt,
      uploaderFirstName: user.first_name,
      uploaderLastName: user.last_name,
      uploaderEmail: user.email,
    })
    .from(studyMaterial)
    .leftJoin(user, eq(studyMaterial.uploadedById, user.id))
    .where(where)
    .orderBy(asc(studyMaterial.position), desc(studyMaterial.uploadedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (materials.length === 0) {
    return { items: [], total, allTotal, page, pageSize, totalPages };
  }

  const links = await db
    .select({
      materialId: assignment.materialId,
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
    })
    .from(assignment)
    .where(
      inArray(
        assignment.materialId,
        materials.map((material) => material.id),
      ),
    )
    .orderBy(desc(assignment.createdAt));

  const byMaterial = new Map<number, LinkedAssignment[]>();
  for (const { materialId, ...link } of links) {
    if (materialId === null) continue;
    const existing = byMaterial.get(materialId);
    if (existing) existing.push(link);
    else byMaterial.set(materialId, [link]);
  }

  const items = materials.map(
    ({ uploaderFirstName, uploaderLastName, uploaderEmail, ...material }) => ({
      ...material,
      uploaderName:
        [uploaderFirstName, uploaderLastName].filter(Boolean).join(' ').trim() ||
        uploaderEmail ||
        null,
      linkedAssignments: byMaterial.get(material.id) ?? [],
    }),
  );

  return { items, total, allTotal, page, pageSize, totalPages };
}

export async function getEditableMaterial(
  classId: number,
  materialId: number,
): Promise<EditableMaterial | null> {
  const [material] = await db
    .select({
      id: studyMaterial.id,
      title: studyMaterial.title,
      description: studyMaterial.description,
      materialType: studyMaterial.materialType,
      category: studyMaterial.category,
      level: studyMaterial.level,
      status: studyMaterial.status,
      content: studyMaterial.content,
      file: studyMaterial.file,
      originalFilename: studyMaterial.originalFilename,
      fileSizeBytes: studyMaterial.fileSizeBytes,
    })
    .from(studyMaterial)
    .where(
      and(
        eq(studyMaterial.id, materialId),
        eq(studyMaterial.studentClassId, classId),
      ),
    )
    .limit(1);

  if (
    !material ||
    !isMaterialType(material.materialType) ||
    !isSubjectCategory(material.category) ||
    !isLevel(material.level) ||
    !isMaterialStatus(material.status)
  ) {
    return null;
  }

  return material as EditableMaterial;
}

/**
 * Assignments a material from this class may be attached to: the class's own
 * assignments plus the level-wide ones its students also see. Archived
 * assignments are left out.
 */
export async function listLinkableAssignments(
  classId: number,
): Promise<LinkableAssignment[]> {
  const rows = await db
    .select({
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
      studentClassId: assignment.studentClassId,
      materialId: assignment.materialId,
    })
    .from(assignment)
    .where(
      and(
        or(
          eq(assignment.studentClassId, classId),
          isNull(assignment.studentClassId),
        ),
        ne(assignment.status, 'archived'),
      ),
    )
    .orderBy(desc(assignment.createdAt));

  return rows.map(({ studentClassId, ...row }) => ({
    ...row,
    classScoped: studentClassId !== null,
  }));
}

/** Django's `slugify`: strip accents, keep word characters, collapse to dashes. */
function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mirror of `StudyMaterial._build_slug`. Not race-free -- neither is Django's --
 * but the column is unique, so a collision surfaces as a failed insert rather
 * than as duplicate slugs.
 */
export async function buildMaterialSlug(title: string): Promise<string> {
  const base = slugify(title).slice(0, 250) || 'material';
  const taken = await db
    .select({ slug: studyMaterial.slug })
    .from(studyMaterial)
    .where(sql`${studyMaterial.slug} = ${base} or ${studyMaterial.slug} like ${`${base}-%`}`);

  const used = new Set(taken.map((row) => row.slug));
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
