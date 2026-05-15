import { AppLayout } from "@/components/layout/app-layout";
import { StudentsPageClient } from "@/components/students/students-page-client";
import { getStudents } from "@/lib/queries/students";
import { getAllLevels } from "@/lib/queries/levels";
import { getAllClasses } from "@/lib/queries/classes";
import { requirePageAccess } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { studentLevels, levels } from "@/lib/db/schema/students";
import { classStudents, classes } from "@/lib/db/schema/classes";
import { eq, desc } from "drizzle-orm";
import type { Student, Level } from "@/lib/types";
import type { StudentSortField, SortDirection } from "@/lib/queries/students";

// ---------------------------------------------------------------------------
// Helpers – enrich student rows with level + class info
// ---------------------------------------------------------------------------

async function getStudentCurrentLevels(
    studentIds: string[],
): Promise<Map<string, Level | null>> {
    const map = new Map<string, Level | null>();
    if (studentIds.length === 0) return map;

    for (const studentId of studentIds) {
        const latestLevel = await db
            .select({
                id: levels.id,
                name: levels.name,
                description: levels.description,
                order: levels.order,
                createdAt: levels.createdAt,
                updatedAt: levels.updatedAt,
            })
            .from(studentLevels)
            .innerJoin(levels, eq(studentLevels.levelId, levels.id))
            .where(eq(studentLevels.studentId, studentId))
            .orderBy(desc(studentLevels.assignedAt))
            .limit(1);

        map.set(studentId, (latestLevel[0] as Level) ?? null);
    }

    return map;
}

async function getStudentEnrolledClassNames(
    studentIds: string[],
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (studentIds.length === 0) return map;

    for (const studentId of studentIds) {
        const rows = await db
            .select({
                className: classes.name,
                classId: classes.id,
            })
            .from(classStudents)
            .innerJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(classStudents.studentId, studentId));

        map.set(
            studentId,
            rows.map((r) => r.className),
        );
    }

    return map;
}

async function getStudentEnrolledClassIds(
    studentIds: string[],
): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (studentIds.length === 0) return map;

    for (const studentId of studentIds) {
        const rows = await db
            .select({
                classId: classes.id,
            })
            .from(classStudents)
            .innerJoin(classes, eq(classStudents.classId, classes.id))
            .where(eq(classStudents.studentId, studentId));

        map.set(
            studentId,
            rows.map((r) => r.classId),
        );
    }

    return map;
}

// ---------------------------------------------------------------------------
// Valid sort fields (used to sanitise the query param)
// ---------------------------------------------------------------------------

const VALID_SORT_FIELDS: Set<string> = new Set([
    "name",
    "studentNumber",
    "enrolledAt",
    "gender",
]);

const VALID_SORT_DIRS: Set<string> = new Set(["asc", "desc"]);

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function StudentsPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        levelId?: string;
        classId?: string;
        gender?: string;
        sortField?: string;
        sortDir?: string;
    }>;
}) {
    await requirePageAccess("students");

    const params = await searchParams;
    const page = parseInt(params.page ?? "1", 10);
    const search = params.search ?? "";
    const filterLevelId = params.levelId ?? undefined;
    const filterClassId = params.classId ?? undefined;
    const filterGender = params.gender as "male" | "female" | undefined;

    // Sanitise sort params
    const sortField: StudentSortField = VALID_SORT_FIELDS.has(
        params.sortField ?? "",
    )
        ? (params.sortField as StudentSortField)
        : "name";

    const sortDir: SortDirection = VALID_SORT_DIRS.has(params.sortDir ?? "")
        ? (params.sortDir as SortDirection)
        : "asc";

    // All filters and sorting are now handled natively at the DB level
    const [result, allLevels, allClasses] = await Promise.all([
        getStudents({
            page,
            pageSize: 20,
            search,
            gender: filterGender,
            levelId: filterLevelId,
            classId: filterClassId,
            sort: { field: sortField, direction: sortDir },
        }),
        getAllLevels(),
        getAllClasses(),
    ]);

    const studentIds = result.data.map((s) => s.id);

    const [levelMap, classNamesMap, classIdsMap] = await Promise.all([
        getStudentCurrentLevels(studentIds),
        getStudentEnrolledClassNames(studentIds),
        getStudentEnrolledClassIds(studentIds),
    ]);

    const studentRows = result.data.map((student: Student) => ({
        student,
        currentLevel: levelMap.get(student.id) ?? null,
        enrolledClasses: classNamesMap.get(student.id) ?? [],
        enrolledClassIds: classIdsMap.get(student.id) ?? [],
    }));

    return (
        <AppLayout title="Students">
            <StudentsPageClient
                result={result}
                studentRows={studentRows}
                levels={allLevels}
                classes={allClasses}
                initialSearch={search}
                initialLevelId={params.levelId ?? ""}
                initialClassId={params.classId ?? ""}
                initialGender={params.gender ?? ""}
                initialSortField={sortField}
                initialSortDir={sortDir}
            />
        </AppLayout>
    );
}
