"use server";

import { db } from "@/lib/db";
import {
    schoolSettings,
    academicYears,
    semesters,
} from "@/lib/db/schema/academics";
import { levels } from "@/lib/db/schema/students";
import { subjects } from "@/lib/db/schema/classes";
import { eq } from "drizzle-orm";
import {
    updateSchoolSettingsSchema,
    createAcademicYearSchema,
    createLevelSchema,
    updateLevelSchema,
    deleteLevelSchema,
    createSubjectSchema,
    updateSubjectSchema,
    deleteSubjectSchema,
    type UpdateSchoolSettingsInput,
    type CreateAcademicYearInput,
    type CreateLevelInput,
    type UpdateLevelInput,
    type DeleteLevelInput,
    type CreateSubjectInput,
    type UpdateSubjectInput,
    type DeleteSubjectInput,
} from "@/lib/validators/settings";
import { computeCalendarPreview } from "@/lib/calendar-utils";
import type { ActionResult } from "@/lib/types";

// Upsert School Settings (insert if none exist, else update)
export async function upsertSchoolSettings(
    input: UpdateSchoolSettingsInput,
): Promise<ActionResult> {
    const parsed = updateSchoolSettingsSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const data = parsed.data;

    try {
        const existing = await db.select().from(schoolSettings).limit(1);

        if (existing.length > 0) {
            await db
                .update(schoolSettings)
                .set({
                    semesterDurationMonths: data.semesterDurationMonths,
                    semestersPerYear: data.semestersPerYear,
                    semesterStartMonths: data.semesterStartMonths,
                    academicYearStartMonth: data.academicYearStartMonth,
                    monthlyPaymentAmount: data.monthlyPaymentAmount,
                    updatedAt: new Date(),
                })
                .where(eq(schoolSettings.id, existing[0].id));
        } else {
            await db.insert(schoolSettings).values({
                id: crypto.randomUUID(),
                semesterDurationMonths: data.semesterDurationMonths,
                semestersPerYear: data.semestersPerYear,
                semesterStartMonths: data.semesterStartMonths,
                academicYearStartMonth: data.academicYearStartMonth,
                monthlyPaymentAmount: data.monthlyPaymentAmount,
            });
        }

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menyimpan pengaturan";
        return { success: false, error: message };
    }
}

// Create Academic Year (and auto-generate semesters from settings)
export async function createAcademicYear(
    input: CreateAcademicYearInput,
): Promise<ActionResult> {
    const parsed = createAcademicYearSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { year } = parsed.data;

    try {
        // Check if year already exists
        const existing = await db
            .select()
            .from(academicYears)
            .where(eq(academicYears.year, year))
            .limit(1);

        if (existing.length > 0) {
            return { success: false, error: `Tahun ajaran ${year} sudah ada` };
        }

        // Fetch current settings for semester generation
        const settingsRows = await db.select().from(schoolSettings).limit(1);

        const settings = settingsRows[0] ?? {
            semesterDurationMonths: 6,
            semestersPerYear: 2,
            semesterStartMonths: [1, 6],
            academicYearStartMonth: 7,
            monthlyPaymentAmount: 0,
        };

        // Compute calendar preview to generate semester dates
        const preview = computeCalendarPreview(year, {
            semesterDurationMonths: settings.semesterDurationMonths,
            semestersPerYear: settings.semestersPerYear,
            semesterStartMonths: settings.semesterStartMonths ?? [1, 6],
            academicYearStartMonth: settings.academicYearStartMonth,
        });

        // Insert academic year,inherit current global monthly payment
        // amount so each year can have its own payment configuration.
        const academicYearId = crypto.randomUUID();
        await db.insert(academicYears).values({
            id: academicYearId,
            year,
            startDate: preview.yearStart,
            endDate: preview.yearEnd,
            monthlyPaymentAmount: settings.monthlyPaymentAmount,
        });

        // Insert generated semesters
        for (const sem of preview.semesters) {
            await db.insert(semesters).values({
                id: crypto.randomUUID(),
                academicYearId,
                name: sem.name,
                semesterNumber: sem.semesterNumber,
                startDate: sem.startDate,
                endDate: sem.endDate,
            });
        }

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal membuat tahun ajaran";
        if (message.includes("unique") || message.includes("duplicate")) {
            return { success: false, error: `Tahun ajaran ${year} sudah ada` };
        }
        return { success: false, error: message };
    }
}

// Update Academic Year Monthly Payment Amount
export async function updateAcademicYearPaymentAmount(input: {
    academicYearId: string;
    monthlyPaymentAmount: number;
}): Promise<ActionResult> {
    const { academicYearId, monthlyPaymentAmount } = input;

    if (!academicYearId || typeof monthlyPaymentAmount !== "number") {
        return { success: false, error: "Input tidak valid" };
    }

    if (monthlyPaymentAmount < 0) {
        return {
            success: false,
            error: "Jumlah pembayaran tidak boleh negatif",
        };
    }

    try {
        const existing = await db
            .select()
            .from(academicYears)
            .where(eq(academicYears.id, academicYearId))
            .limit(1);

        if (existing.length === 0) {
            return { success: false, error: "Tahun ajaran tidak ditemukan" };
        }

        await db
            .update(academicYears)
            .set({
                monthlyPaymentAmount,
                updatedAt: new Date(),
            })
            .where(eq(academicYears.id, academicYearId));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal memperbarui biaya bulanan";
        return { success: false, error: message };
    }
}

// Create Level
export async function createLevel(
    input: CreateLevelInput,
): Promise<ActionResult> {
    const parsed = createLevelSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.insert(levels).values({
            id: crypto.randomUUID(),
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            order: parsed.data.order,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat level";
        return { success: false, error: message };
    }
}

// Update Level
export async function updateLevel(
    input: UpdateLevelInput,
): Promise<ActionResult> {
    const parsed = updateLevelSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, name, description, order } = parsed.data;

    try {
        await db
            .update(levels)
            .set({
                name,
                description: description ?? null,
                order,
                updatedAt: new Date(),
            })
            .where(eq(levels.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui level";
        return { success: false, error: message };
    }
}

// Delete Level
export async function deleteLevel(
    input: DeleteLevelInput,
): Promise<ActionResult> {
    const parsed = deleteLevelSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(levels).where(eq(levels.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus level";
        if (message.includes("foreign key") || message.includes("constraint")) {
            return {
                success: false,
                error: "Level tidak dapat dihapus karena masih digunakan oleh siswa atau kelas",
            };
        }
        return { success: false, error: message };
    }
}

// Create Subject
export async function createSubject(
    input: CreateSubjectInput,
): Promise<ActionResult> {
    const parsed = createSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.insert(subjects).values({
            id: crypto.randomUUID(),
            name: parsed.data.name,
            description: parsed.data.description ?? null,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal membuat mata pelajaran";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Mata pelajaran dengan nama ini sudah ada",
            };
        }
        return { success: false, error: message };
    }
}

// Update Subject
export async function updateSubject(
    input: UpdateSubjectInput,
): Promise<ActionResult> {
    const parsed = updateSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, name, description } = parsed.data;

    try {
        await db
            .update(subjects)
            .set({
                name,
                description: description ?? null,
                updatedAt: new Date(),
            })
            .where(eq(subjects.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal memperbarui mata pelajaran";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Mata pelajaran dengan nama ini sudah ada",
            };
        }
        return { success: false, error: message };
    }
}

// Delete Subject
export async function deleteSubject(
    input: DeleteSubjectInput,
): Promise<ActionResult> {
    const parsed = deleteSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(subjects).where(eq(subjects.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menghapus mata pelajaran";
        if (message.includes("foreign key") || message.includes("constraint")) {
            return {
                success: false,
                error: "Mata pelajaran tidak dapat dihapus karena masih digunakan oleh kelas",
            };
        }
        return { success: false, error: message };
    }
}
