import { db } from "@/lib/db";
import {
    classes,
    classStudents,
    classSubjects,
    subjects,
    periods,
} from "@/lib/db/schema/classes";
import { students, levels } from "@/lib/db/schema/students";
import { academicYears, semesters } from "@/lib/db/schema/academics";
import { user } from "@/lib/db/schema/auth";
import { eq, asc, desc, count, and, like, or, SQL } from "drizzle-orm";
import type {
    ClassRecord,
    ClassWithDetails,
    ClassStudent,
    ClassSubjectWithDetails,
    Period,
    Subject,
    Student,
    PaginatedResult,
} from "@/lib/types";

// Get all classes (paginated)
export async function getClasses(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    academicYearId?: string;
}): Promise<PaginatedResult<ClassWithDetails>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];
    if (opts.search) {
        conditions.push(
            or(
                like(classes.name, `%${opts.search}%`),
                like(user.name, `%${opts.search}%`),
            )!,
        );
    }
    if (opts.academicYearId) {
        conditions.push(eq(classes.academicYearId, opts.academicYearId));
    }

    const whereClause =
        conditions.length > 1
            ? and(...conditions)
            : conditions.length === 1
              ? conditions[0]
              : undefined;

    const data = await db
        .select({
            id: classes.id,
            name: classes.name,
            academicYearId: classes.academicYearId,
            teacherId: classes.teacherId,
            capacity: classes.capacity,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
            academicYear: {
                id: academicYears.id,
                year: academicYears.year,
                startDate: academicYears.startDate,
                endDate: academicYears.endDate,
                monthlyPaymentAmount: academicYears.monthlyPaymentAmount,
                createdAt: academicYears.createdAt,
                updatedAt: academicYears.updatedAt,
            },
            teacher: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
        .from(classes)
        .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
        .innerJoin(user, eq(classes.teacherId, user.id))
        .where(whereClause)
        .orderBy(desc(academicYears.year), asc(classes.name))
        .limit(pageSize)
        .offset(offset);

    const totalResult = await db
        .select({ total: count() })
        .from(classes)
        .innerJoin(user, eq(classes.teacherId, user.id))
        .where(whereClause);

    const total = totalResult[0]?.total ?? 0;

    // Fetch student counts for each class
    const classIds = data.map((c) => c.id);
    const studentCounts = await getStudentCountsForClasses(classIds);

    const enriched: ClassWithDetails[] = data.map((row) => ({
        ...row,
        studentCount: studentCounts.get(row.id) ?? 0,
    }));

    return {
        data: enriched,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

// Get a single class by ID with details
export async function getClassById(
    id: string,
): Promise<ClassWithDetails | null> {
    const rows = await db
        .select({
            id: classes.id,
            name: classes.name,
            academicYearId: classes.academicYearId,
            teacherId: classes.teacherId,
            capacity: classes.capacity,
            createdAt: classes.createdAt,
            updatedAt: classes.updatedAt,
            academicYear: {
                id: academicYears.id,
                year: academicYears.year,
                startDate: academicYears.startDate,
                endDate: academicYears.endDate,
                monthlyPaymentAmount: academicYears.monthlyPaymentAmount,
                createdAt: academicYears.createdAt,
                updatedAt: academicYears.updatedAt,
            },
            teacher: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        })
        .from(classes)
        .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
        .innerJoin(user, eq(classes.teacherId, user.id))
        .where(eq(classes.id, id))
        .limit(1);

    if (!rows[0]) return null;

    const studentCounts = await getStudentCountsForClasses([id]);

    return {
        ...rows[0],
        studentCount: studentCounts.get(id) ?? 0,
    };
}

// Get students enrolled in a class
export async function getClassStudents(
    classId: string,
): Promise<ClassStudent[]> {
    const rows = await db
        .select({
            id: classStudents.id,
            classId: classStudents.classId,
            studentId: classStudents.studentId,
            enrolledAt: classStudents.enrolledAt,
            student: {
                id: students.id,
                name: students.name,
                studentNumber: students.studentNumber,
                dateOfBirth: students.dateOfBirth,
                enrolledAt: students.enrolledAt,
                createdAt: students.createdAt,
                updatedAt: students.updatedAt,
            },
        })
        .from(classStudents)
        .innerJoin(students, eq(classStudents.studentId, students.id))
        .where(eq(classStudents.classId, classId))
        .orderBy(asc(students.name));

    return rows as ClassStudent[];
}

// Get class subjects (optionally filtered by semester)
export async function getClassSubjects(
    classId: string,
    semesterId?: string,
): Promise<ClassSubjectWithDetails[]> {
    const conditions: SQL[] = [eq(classSubjects.classId, classId)];
    if (semesterId) {
        conditions.push(eq(classSubjects.semesterId, semesterId));
    }

    const rows = await db
        .select({
            id: classSubjects.id,
            classId: classSubjects.classId,
            subjectId: classSubjects.subjectId,
            semesterId: classSubjects.semesterId,
            levelId: classSubjects.levelId,
            formulaConfig: classSubjects.formulaConfig,
            createdAt: classSubjects.createdAt,
            updatedAt: classSubjects.updatedAt,
            subject: {
                id: subjects.id,
                name: subjects.name,
                description: subjects.description,
                createdAt: subjects.createdAt,
                updatedAt: subjects.updatedAt,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
                semesterNumber: semesters.semesterNumber,
            },
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(semesters, eq(classSubjects.semesterId, semesters.id))
        .where(and(...conditions))
        .orderBy(asc(semesters.semesterNumber), asc(subjects.name));

    // Fetch levels and periods for each class subject
    const classSubjectIds = rows.map((r) => r.id);
    const [levelMap, periodMap] = await Promise.all([
        getLevelsForClassSubjects(rows),
        getPeriodsForClassSubjects(classSubjectIds),
    ]);

    return rows.map((row) => ({
        ...row,
        level: levelMap.get(row.id) ?? null,
        periods: periodMap.get(row.id) ?? [],
    })) as ClassSubjectWithDetails[];
}

// Get a single class subject by ID
export async function getClassSubjectById(
    id: string,
): Promise<ClassSubjectWithDetails | null> {
    const rows = await db
        .select({
            id: classSubjects.id,
            classId: classSubjects.classId,
            subjectId: classSubjects.subjectId,
            semesterId: classSubjects.semesterId,
            levelId: classSubjects.levelId,
            formulaConfig: classSubjects.formulaConfig,
            createdAt: classSubjects.createdAt,
            updatedAt: classSubjects.updatedAt,
            subject: {
                id: subjects.id,
                name: subjects.name,
                description: subjects.description,
                createdAt: subjects.createdAt,
                updatedAt: subjects.updatedAt,
            },
            semester: {
                id: semesters.id,
                name: semesters.name,
                semesterNumber: semesters.semesterNumber,
            },
        })
        .from(classSubjects)
        .innerJoin(subjects, eq(classSubjects.subjectId, subjects.id))
        .innerJoin(semesters, eq(classSubjects.semesterId, semesters.id))
        .where(eq(classSubjects.id, id))
        .limit(1);

    if (!rows[0]) return null;

    const [levelMap, periodMap] = await Promise.all([
        getLevelsForClassSubjects(rows),
        getPeriodsForClassSubjects([rows[0].id]),
    ]);

    return {
        ...rows[0],
        level: levelMap.get(rows[0].id) ?? null,
        periods: periodMap.get(rows[0].id) ?? [],
    } as ClassSubjectWithDetails;
}

// Get periods for a class subject
export async function getPeriodsByClassSubject(
    classSubjectId: string,
): Promise<Period[]> {
    const rows = await db
        .select()
        .from(periods)
        .where(eq(periods.classSubjectId, classSubjectId))
        .orderBy(asc(periods.order));

    return rows as Period[];
}

// Get a single period by ID
export async function getPeriodById(id: string): Promise<Period | null> {
    const rows = await db
        .select()
        .from(periods)
        .where(eq(periods.id, id))
        .limit(1);

    return (rows[0] as Period) ?? null;
}

// Get all subjects
export async function getAllSubjects(): Promise<Subject[]> {
    const rows = await db.select().from(subjects).orderBy(asc(subjects.name));

    return rows as Subject[];
}

// Get all classes (no pagination, for dropdowns)
export async function getAllClasses(): Promise<ClassRecord[]> {
    const rows = await db.select().from(classes).orderBy(asc(classes.name));

    return rows as ClassRecord[];
}

// Get all teachers (users with role "teacher" only)
export async function getAllTeachers(): Promise<
    { id: string; name: string; email: string; role: string | null }[]
> {
    const rows = await db
        .select({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
        })
        .from(user)
        .where(eq(user.role, "teacher"))
        .orderBy(asc(user.name));

    return rows;
}

// Get students NOT in a specific class (for enrollment)
export async function getStudentsNotInClass(
    classId: string,
): Promise<Student[]> {
    const enrolled = await db
        .select({ studentId: classStudents.studentId })
        .from(classStudents)
        .where(eq(classStudents.classId, classId));

    const enrolledIds = new Set(enrolled.map((e) => e.studentId));

    const allStudents = await db
        .select()
        .from(students)
        .orderBy(asc(students.name));

    return allStudents.filter((s) => !enrolledIds.has(s.id)) as Student[];
}

// Helpers
async function getStudentCountsForClasses(
    classIds: string[],
): Promise<Map<string, number>> {
    if (classIds.length === 0) return new Map();

    const counts = await db
        .select({
            classId: classStudents.classId,
            count: count(),
        })
        .from(classStudents)
        .groupBy(classStudents.classId);

    const map = new Map<string, number>();
    for (const row of counts) {
        if (classIds.includes(row.classId)) {
            map.set(row.classId, row.count);
        }
    }
    return map;
}

async function getLevelsForClassSubjects(
    rows: { id: string; levelId: string | null }[],
): Promise<
    Map<
        string,
        {
            id: string;
            name: string;
            description: string | null;
            order: number;
            createdAt: Date;
            updatedAt: Date;
        } | null
    >
> {
    const levelIds = rows
        .map((r) => r.levelId)
        .filter((id): id is string => id !== null);

    if (levelIds.length === 0) return new Map();

    const uniqueIds = [...new Set(levelIds)];
    const levelRows = await db
        .select()
        .from(levels)
        .where(or(...uniqueIds.map((id) => eq(levels.id, id)))!);

    const levelMap = new Map<string, (typeof levelRows)[number]>();
    for (const l of levelRows) {
        levelMap.set(l.id, l);
    }

    const result = new Map<string, (typeof levelRows)[number] | null>();
    for (const row of rows) {
        result.set(
            row.id,
            row.levelId ? (levelMap.get(row.levelId) ?? null) : null,
        );
    }
    return result;
}

async function getPeriodsForClassSubjects(
    classSubjectIds: string[],
): Promise<Map<string, Period[]>> {
    if (classSubjectIds.length === 0) return new Map();

    const allPeriods = await db
        .select()
        .from(periods)
        .where(
            or(...classSubjectIds.map((id) => eq(periods.classSubjectId, id)))!,
        )
        .orderBy(asc(periods.order));

    const map = new Map<string, Period[]>();
    for (const p of allPeriods) {
        const existing = map.get(p.classSubjectId) ?? [];
        existing.push(p as Period);
        map.set(p.classSubjectId, existing);
    }
    return map;
}
