import { db } from "@/lib/db";
import {
    studyMaterials,
    studyMaterialAssignments,
} from "@/lib/db/schema/materials";
import { user } from "@/lib/db/schema/auth";
import { eq, asc, desc, count, like, or, and, SQL } from "drizzle-orm";
import type {
    StudyMaterial,
    StudyMaterialWithAssignments,
    MaterialAssignment,
    PaginatedResult,
} from "@/lib/types";

// Get all materials (paginated, with uploader info)
export async function getMaterials(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    fileType?: "pdf" | "ppt" | "pptx";
    classId?: string;
    levelId?: string;
}): Promise<PaginatedResult<StudyMaterialWithAssignments>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (opts.search) {
        conditions.push(
            or(
                like(studyMaterials.title, `%${opts.search}%`),
                like(studyMaterials.description, `%${opts.search}%`),
            )!,
        );
    }
    if (opts.fileType) {
        conditions.push(eq(studyMaterials.fileType, opts.fileType));
    }

    const whereClause =
        conditions.length > 1
            ? and(...conditions)
            : conditions.length === 1
              ? conditions[0]
              : undefined;

    const [data, totalResult] = await Promise.all([
        db
            .select({
                id: studyMaterials.id,
                title: studyMaterials.title,
                description: studyMaterials.description,
                fileUrl: studyMaterials.fileUrl,
                fileType: studyMaterials.fileType,
                fileSize: studyMaterials.fileSize,
                uploadedBy: studyMaterials.uploadedBy,
                createdAt: studyMaterials.createdAt,
                updatedAt: studyMaterials.updatedAt,
                uploader: {
                    id: user.id,
                    name: user.name,
                },
            })
            .from(studyMaterials)
            .innerJoin(user, eq(studyMaterials.uploadedBy, user.id))
            .where(whereClause)
            .orderBy(desc(studyMaterials.createdAt))
            .limit(pageSize)
            .offset(offset),
        db.select({ total: count() }).from(studyMaterials).where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    // Fetch assignments for each material
    const materialIds = data.map((m) => m.id);
    const assignmentMap = await getMaterialAssignmentsMap(materialIds);

    const enriched: StudyMaterialWithAssignments[] = data.map((row) => ({
        ...row,
        assignments: assignmentMap.get(row.id) ?? [],
    })) as StudyMaterialWithAssignments[];

    // Apply post-fetch filters for class and level (via assignments)
    let filtered = enriched;
    if (opts.classId) {
        filtered = filtered.filter((m) =>
            m.assignments.some((a) => a.classId === opts.classId),
        );
    }
    if (opts.levelId) {
        filtered = filtered.filter((m) =>
            m.assignments.some((a) => a.levelId === opts.levelId),
        );
    }

    return {
        data: filtered,
        total: opts.classId || opts.levelId ? filtered.length : total,
        page,
        pageSize,
        totalPages: Math.ceil(
            (opts.classId || opts.levelId ? filtered.length : total) / pageSize,
        ),
    };
}

// ---------------------------------------------------------------------------
// Get a single material by ID (with uploader and assignments)
// ---------------------------------------------------------------------------
export async function getMaterialById(
    id: string,
): Promise<StudyMaterialWithAssignments | null> {
    const rows = await db
        .select({
            id: studyMaterials.id,
            title: studyMaterials.title,
            description: studyMaterials.description,
            fileUrl: studyMaterials.fileUrl,
            fileType: studyMaterials.fileType,
            fileSize: studyMaterials.fileSize,
            uploadedBy: studyMaterials.uploadedBy,
            createdAt: studyMaterials.createdAt,
            updatedAt: studyMaterials.updatedAt,
            uploader: {
                id: user.id,
                name: user.name,
            },
        })
        .from(studyMaterials)
        .innerJoin(user, eq(studyMaterials.uploadedBy, user.id))
        .where(eq(studyMaterials.id, id))
        .limit(1);

    if (!rows[0]) return null;

    const assignmentMap = await getMaterialAssignmentsMap([id]);

    return {
        ...rows[0],
        assignments: assignmentMap.get(id) ?? [],
    } as StudyMaterialWithAssignments;
}

// Get materials assigned to a specific class
export async function getMaterialsByClass(
    classId: string,
): Promise<StudyMaterial[]> {
    const assignmentRows = await db
        .select({ materialId: studyMaterialAssignments.materialId })
        .from(studyMaterialAssignments)
        .where(eq(studyMaterialAssignments.classId, classId));

    if (assignmentRows.length === 0) return [];

    const materialIds = [...new Set(assignmentRows.map((r) => r.materialId))];

    const rows = await db
        .select()
        .from(studyMaterials)
        .where(or(...materialIds.map((id) => eq(studyMaterials.id, id)))!)
        .orderBy(desc(studyMaterials.createdAt));

    return rows as StudyMaterial[];
}

// Get materials assigned to a specific level
export async function getMaterialsByLevel(
    levelId: string,
): Promise<StudyMaterial[]> {
    const assignmentRows = await db
        .select({ materialId: studyMaterialAssignments.materialId })
        .from(studyMaterialAssignments)
        .where(eq(studyMaterialAssignments.levelId, levelId));

    if (assignmentRows.length === 0) return [];

    const materialIds = [...new Set(assignmentRows.map((r) => r.materialId))];

    const rows = await db
        .select()
        .from(studyMaterials)
        .where(or(...materialIds.map((id) => eq(studyMaterials.id, id)))!)
        .orderBy(desc(studyMaterials.createdAt));

    return rows as StudyMaterial[];
}

// Get materials assigned to a specific period
export async function getMaterialsByPeriod(
    periodId: string,
): Promise<StudyMaterial[]> {
    const assignmentRows = await db
        .select({ materialId: studyMaterialAssignments.materialId })
        .from(studyMaterialAssignments)
        .where(eq(studyMaterialAssignments.periodId, periodId));

    if (assignmentRows.length === 0) return [];

    const materialIds = [...new Set(assignmentRows.map((r) => r.materialId))];

    const rows = await db
        .select()
        .from(studyMaterials)
        .where(or(...materialIds.map((id) => eq(studyMaterials.id, id)))!)
        .orderBy(desc(studyMaterials.createdAt));

    return rows as StudyMaterial[];
}

// Get assignments (class/period/level links) for a material
export async function getMaterialAssignments(
    materialId: string,
): Promise<MaterialAssignment[]> {
    const rows = await db
        .select()
        .from(studyMaterialAssignments)
        .where(eq(studyMaterialAssignments.materialId, materialId))
        .orderBy(asc(studyMaterialAssignments.createdAt));

    return rows as MaterialAssignment[];
}

// Helper, bulk fetch assignments for multiple materials
async function getMaterialAssignmentsMap(
    materialIds: string[],
): Promise<Map<string, MaterialAssignment[]>> {
    if (materialIds.length === 0) return new Map();

    const rows = await db
        .select()
        .from(studyMaterialAssignments)
        .where(
            or(
                ...materialIds.map((id) =>
                    eq(studyMaterialAssignments.materialId, id),
                ),
            )!,
        )
        .orderBy(asc(studyMaterialAssignments.createdAt));

    const map = new Map<string, MaterialAssignment[]>();
    for (const row of rows) {
        const existing = map.get(row.materialId) ?? [];
        existing.push(row as MaterialAssignment);
        map.set(row.materialId, existing);
    }
    return map;
}
