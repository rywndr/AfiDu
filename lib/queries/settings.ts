import { db } from "@/lib/db";
import {
    schoolSettings,
    academicYears,
    semesters,
} from "@/lib/db/schema/academics";
import { eq, asc, desc } from "drizzle-orm";
import type {
    SchoolSettings,
    AcademicYear,
    AcademicYearWithSemesters,
    Semester,
} from "@/lib/types";

// School Settings, single-row config
export async function getSchoolSettings(): Promise<SchoolSettings | null> {
    const rows = await db.select().from(schoolSettings).limit(1);

    return (rows[0] as SchoolSettings) ?? null;
}

/**
 * Get settings or return sensible defaults if none exist yet.
 */
export async function getSchoolSettingsOrDefaults(): Promise<SchoolSettings> {
    const existing = await getSchoolSettings();
    if (existing) return existing;

    return {
        id: "",
        semesterDurationMonths: 6,
        semestersPerYear: 2,
        schoolStartMonth: 7,
        semesterStartMonths: [1, 6],
        academicYearStartMonth: 7,
        monthlyPaymentAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}

// Academic Years
export async function getAcademicYears(): Promise<AcademicYear[]> {
    const rows = await db
        .select()
        .from(academicYears)
        .orderBy(desc(academicYears.year));

    return rows as AcademicYear[];
}

export async function getAcademicYearById(
    id: string,
): Promise<AcademicYear | null> {
    const rows = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.id, id))
        .limit(1);

    return (rows[0] as AcademicYear) ?? null;
}

export async function getAcademicYearByYear(
    year: string,
): Promise<AcademicYear | null> {
    const rows = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.year, year))
        .limit(1);

    return (rows[0] as AcademicYear) ?? null;
}

// Academic Years with Semesters
export async function getAcademicYearsWithSemesters(): Promise<
    AcademicYearWithSemesters[]
> {
    const years = await getAcademicYears();
    if (years.length === 0) return [];

    const allSemesters = await db
        .select()
        .from(semesters)
        .orderBy(asc(semesters.semesterNumber));

    const semestersByYear = new Map<string, Semester[]>();
    for (const sem of allSemesters) {
        const existing = semestersByYear.get(sem.academicYearId) ?? [];
        existing.push(sem as Semester);
        semestersByYear.set(sem.academicYearId, existing);
    }

    return years.map((year) => ({
        ...year,
        semesters: semestersByYear.get(year.id) ?? [],
    }));
}

export async function getAcademicYearWithSemesters(
    id: string,
): Promise<AcademicYearWithSemesters | null> {
    const year = await getAcademicYearById(id);
    if (!year) return null;

    const yearSemesters = await db
        .select()
        .from(semesters)
        .where(eq(semesters.academicYearId, id))
        .orderBy(asc(semesters.semesterNumber));

    return {
        ...year,
        semesters: yearSemesters as Semester[],
    };
}

// Semesters
export async function getSemesterById(id: string): Promise<Semester | null> {
    const rows = await db
        .select()
        .from(semesters)
        .where(eq(semesters.id, id))
        .limit(1);

    return (rows[0] as Semester) ?? null;
}

export async function getSemestersByAcademicYear(
    academicYearId: string,
): Promise<Semester[]> {
    const rows = await db
        .select()
        .from(semesters)
        .where(eq(semesters.academicYearId, academicYearId))
        .orderBy(asc(semesters.semesterNumber));

    return rows as Semester[];
}

export async function getAllSemesters(): Promise<Semester[]> {
    const rows = await db
        .select()
        .from(semesters)
        .orderBy(desc(semesters.startDate));

    return rows as Semester[];
}

// Calendar Preview. re-exported from @/lib/calendar-utils so client
// components can import pure function without pulling in the db module
export { computeCalendarPreview } from "@/lib/calendar-utils";
