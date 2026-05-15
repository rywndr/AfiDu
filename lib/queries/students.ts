import { db } from "@/lib/db";
import { students, studentLevels, levels } from "@/lib/db/schema/students";
import { semesters, academicYears } from "@/lib/db/schema/academics";
import { classStudents, classes } from "@/lib/db/schema/classes";
import { user } from "@/lib/db/schema/auth";
import { eq, desc, asc, count, like, or, and, inArray, SQL } from "drizzle-orm";
import type {
    Student,
    StudentWithLevel,
    StudentLevelRecord,
    StudentEnrollment,
    PaginatedResult,
} from "@/lib/types";

// Sort options for student listing
export type StudentSortField =
    | "name"
    | "studentNumber"
    | "enrolledAt"
    | "gender";
export type SortDirection = "asc" | "desc";

export interface StudentSortOption {
    field: StudentSortField;
    direction: SortDirection;
}

// Filter options for student listing
export interface StudentFilterOptions {
    page?: number;
    pageSize?: number;
    search?: string;
    gender?: "male" | "female";
    levelId?: string;
    classId?: string;
    sort?: StudentSortOption;
}

// Get all students (paginated) with native filtering and sorting
export async function getStudents(
    opts: StudentFilterOptions,
): Promise<PaginatedResult<Student>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // --- Determine which student IDs match level/class filters ---
    // These filters require joining through other tables, so we resolve IDs first
    // and then use `inArray` to constrain the main query.

    let filteredByLevelIds: string[] | null = null;
    let filteredByClassIds: string[] | null = null;

    if (opts.levelId) {
        // Get student IDs that have the latest level matching the given levelId.
        // We find all students assigned to this level (latest assignment wins).
        const rows = await db
            .select({ studentId: studentLevels.studentId })
            .from(studentLevels)
            .where(eq(studentLevels.levelId, opts.levelId));

        filteredByLevelIds = [...new Set(rows.map((r) => r.studentId))];

        // If no students match this level, short-circuit
        if (filteredByLevelIds.length === 0) {
            return { data: [], total: 0, page, pageSize, totalPages: 0 };
        }
    }

    if (opts.classId) {
        const rows = await db
            .select({ studentId: classStudents.studentId })
            .from(classStudents)
            .where(eq(classStudents.classId, opts.classId));

        filteredByClassIds = [...new Set(rows.map((r) => r.studentId))];

        if (filteredByClassIds.length === 0) {
            return { data: [], total: 0, page, pageSize, totalPages: 0 };
        }
    }

    // --- Build conditions ---
    const conditions: SQL[] = [];

    if (opts.search) {
        conditions.push(
            or(
                like(students.name, `%${opts.search}%`),
                like(students.studentNumber, `%${opts.search}%`),
            )!,
        );
    }

    if (opts.gender) {
        conditions.push(eq(students.gender, opts.gender));
    }

    if (filteredByLevelIds !== null) {
        conditions.push(inArray(students.id, filteredByLevelIds));
    }

    if (filteredByClassIds !== null) {
        conditions.push(inArray(students.id, filteredByClassIds));
    }

    // Intersect level + class filtered IDs if both are present
    // (already handled by stacking inArray conditions with AND)

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // --- Build sort order ---
    const sortField = opts.sort?.field ?? "name";
    const sortDir = opts.sort?.direction ?? "asc";

    const sortFn = sortDir === "desc" ? desc : asc;

    const SORT_COLUMN_MAP = {
        name: students.name,
        studentNumber: students.studentNumber,
        enrolledAt: students.enrolledAt,
        gender: students.gender,
    } as const;

    const orderByColumn = SORT_COLUMN_MAP[sortField] ?? students.name;

    // --- Execute queries ---
    const [data, totalResult] = await Promise.all([
        db
            .select()
            .from(students)
            .where(whereClause)
            .orderBy(sortFn(orderByColumn))
            .limit(pageSize)
            .offset(offset),
        db.select({ total: count() }).from(students).where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
        data: data as Student[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

// Get a single student by ID
export async function getStudentById(id: string): Promise<Student | null> {
    const result = await db
        .select()
        .from(students)
        .where(eq(students.id, id))
        .limit(1);

    return (result[0] as Student) ?? null;
}

// Get a student with their current (latest) level
export async function getStudentWithCurrentLevel(
    id: string,
): Promise<StudentWithLevel | null> {
    const student = await getStudentById(id);
    if (!student) return null;

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
        .where(eq(studentLevels.studentId, id))
        .orderBy(desc(studentLevels.assignedAt))
        .limit(1);

    return {
        ...student,
        currentLevel:
            (latestLevel[0] as StudentWithLevel["currentLevel"]) ?? null,
    };
}

// Get level history for a student
export async function getStudentLevelHistory(
    studentId: string,
): Promise<StudentLevelRecord[]> {
    const rows = await db
        .select({
            id: studentLevels.id,
            studentId: studentLevels.studentId,
            levelId: studentLevels.levelId,
            semesterId: studentLevels.semesterId,
            assignedAt: studentLevels.assignedAt,
            level: {
                id: levels.id,
                name: levels.name,
                description: levels.description,
                order: levels.order,
                createdAt: levels.createdAt,
                updatedAt: levels.updatedAt,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
                semesterNumber: semesters.semesterNumber,
            },
        })
        .from(studentLevels)
        .innerJoin(levels, eq(studentLevels.levelId, levels.id))
        .innerJoin(semesters, eq(studentLevels.semesterId, semesters.id))
        .where(eq(studentLevels.studentId, studentId))
        .orderBy(desc(studentLevels.assignedAt));

    return rows as StudentLevelRecord[];
}

// Get all students (no pagination, for dropdowns/selects)
export async function getAllStudents(): Promise<Student[]> {
    const rows = await db.select().from(students).orderBy(asc(students.name));

    return rows as Student[];
}

// Get total student count
export async function getStudentCount(): Promise<number> {
    const result = await db.select({ total: count() }).from(students);

    return result[0]?.total ?? 0;
}

// Get classes a student is enrolled in (with class + academic year details)
export async function getStudentEnrollments(
    studentId: string,
): Promise<StudentEnrollment[]> {
    const rows = await db
        .select({
            id: classStudents.id,
            classId: classStudents.classId,
            studentId: classStudents.studentId,
            enrolledAt: classStudents.enrolledAt,
            className: classes.name,
            academicYear: academicYears.year,
            teacherName: user.name,
        })
        .from(classStudents)
        .innerJoin(classes, eq(classStudents.classId, classes.id))
        .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
        .innerJoin(user, eq(classes.teacherId, user.id))
        .where(eq(classStudents.studentId, studentId))
        .orderBy(desc(academicYears.year), asc(classes.name));

    return rows as StudentEnrollment[];
}
