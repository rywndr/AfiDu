"use server";

import { db } from "@/lib/db";
import {
    classes,
    classStudents,
    classSubjects,
    periods,
} from "@/lib/db/schema/classes";
import { assignments, assignmentScores } from "@/lib/db/schema/grading";
import { eq, and, count } from "drizzle-orm";
import {
    createClassSchema,
    updateClassSchema,
    deleteClassSchema,
    enrollStudentSchema,
    removeStudentSchema,
    addClassSubjectSchema,
    updateClassSubjectSchema,
    removeClassSubjectSchema,
    createPeriodSchema,
    updatePeriodSchema,
    deletePeriodSchema,
    createAssignmentSchema,
    updateAssignmentSchema,
    deleteAssignmentSchema,
    saveScoreSchema,
    saveScoresBatchSchema,
    type CreateClassInput,
    type UpdateClassInput,
    type DeleteClassInput,
    type EnrollStudentInput,
    type RemoveStudentInput,
    type AddClassSubjectInput,
    type UpdateClassSubjectInput,
    type RemoveClassSubjectInput,
    type CreatePeriodInput,
    type UpdatePeriodInput,
    type DeletePeriodInput,
    type CreateAssignmentInput,
    type UpdateAssignmentInput,
    type DeleteAssignmentInput,
    type SaveScoreInput,
    type SaveScoresBatchInput,
} from "@/lib/validators/classes";
import type { ActionResult } from "@/lib/types";

// Create Class
export async function createClass(
    input: CreateClassInput,
): Promise<ActionResult> {
    const parsed = createClassSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { name, academicYearId, teacherId, capacity } = parsed.data;

    try {
        await db.insert(classes).values({
            id: crypto.randomUUID(),
            name,
            academicYearId,
            teacherId,
            capacity,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat kelas";
        return { success: false, error: message };
    }
}

// Update Class
export async function updateClass(
    input: UpdateClassInput,
): Promise<ActionResult> {
    const parsed = updateClassSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, name, academicYearId, teacherId, capacity } = parsed.data;

    try {
        await db
            .update(classes)
            .set({
                name,
                academicYearId,
                teacherId,
                capacity,
                updatedAt: new Date(),
            })
            .where(eq(classes.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui kelas";
        return { success: false, error: message };
    }
}

// Delete Class
export async function deleteClass(
    input: DeleteClassInput,
): Promise<ActionResult> {
    const parsed = deleteClassSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(classes).where(eq(classes.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus kelas";
        if (message.includes("foreign key") || message.includes("constraint")) {
            return {
                success: false,
                error: "Kelas tidak dapat dihapus karena masih memiliki data terkait",
            };
        }
        return { success: false, error: message };
    }
}

// Enroll Student in Class
//
// Check capacity before enrolling. If class is at/over capacity and
// `forceEnroll` not true, returns an error with code "CAPACITY_EXCEEDED"
// so frontend can show confirmation dialog.
export async function enrollStudent(
    input: EnrollStudentInput,
): Promise<ActionResult> {
    const parsed = enrollStudentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { classId, studentId, forceEnroll } = parsed.data;

    try {
        // Check capacity
        const classRecord = await db
            .select({ capacity: classes.capacity })
            .from(classes)
            .where(eq(classes.id, classId))
            .limit(1);

        if (classRecord.length === 0) {
            return { success: false, error: "Kelas tidak ditemukan" };
        }

        const [{ count: currentCount }] = await db
            .select({ count: count() })
            .from(classStudents)
            .where(eq(classStudents.classId, classId));

        const capacity = classRecord[0].capacity;

        if (currentCount >= capacity && !forceEnroll) {
            return {
                success: false,
                error: `CAPACITY_EXCEEDED:Kelas sudah penuh (${currentCount}/${capacity}). Apakah Anda tetap ingin mendaftarkan siswa?`,
            };
        }

        await db.insert(classStudents).values({
            id: crypto.randomUUID(),
            classId,
            studentId,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal mendaftarkan siswa";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Siswa sudah terdaftar di kelas ini",
            };
        }
        return { success: false, error: message };
    }
}

// Remove Student from Class
export async function removeStudent(
    input: RemoveStudentInput,
): Promise<ActionResult> {
    const parsed = removeStudentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { classId, studentId } = parsed.data;

    try {
        await db
            .delete(classStudents)
            .where(
                and(
                    eq(classStudents.classId, classId),
                    eq(classStudents.studentId, studentId),
                ),
            );

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal mengeluarkan siswa dari kelas";
        return { success: false, error: message };
    }
}

// Add Subject to Class (create class_subject)
export async function addClassSubject(
    input: AddClassSubjectInput,
): Promise<ActionResult> {
    const parsed = addClassSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { classId, subjectId, semesterId, levelId, formulaConfig } =
        parsed.data;

    try {
        await db.insert(classSubjects).values({
            id: crypto.randomUUID(),
            classId,
            subjectId,
            semesterId,
            levelId: levelId ?? null,
            formulaConfig: formulaConfig ?? null,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menambahkan mata pelajaran";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Mata pelajaran sudah ditambahkan untuk semester ini di kelas ini",
            };
        }
        return { success: false, error: message };
    }
}

// Update Class Subject (formula config, level)
export async function updateClassSubject(
    input: UpdateClassSubjectInput,
): Promise<ActionResult> {
    const parsed = updateClassSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, levelId, formulaConfig } = parsed.data;

    try {
        await db
            .update(classSubjects)
            .set({
                levelId: levelId ?? null,
                formulaConfig: formulaConfig ?? null,
                updatedAt: new Date(),
            })
            .where(eq(classSubjects.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal memperbarui mata pelajaran kelas";
        return { success: false, error: message };
    }
}

// Remove Class Subject
export async function removeClassSubject(
    input: RemoveClassSubjectInput,
): Promise<ActionResult> {
    const parsed = removeClassSubjectSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db
            .delete(classSubjects)
            .where(eq(classSubjects.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menghapus mata pelajaran kelas";
        return { success: false, error: message };
    }
}

// Create Period
export async function createPeriod(
    input: CreatePeriodInput,
): Promise<ActionResult> {
    const parsed = createPeriodSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { classSubjectId, name, order, formulaConfig } = parsed.data;

    try {
        await db.insert(periods).values({
            id: crypto.randomUUID(),
            classSubjectId,
            name,
            order,
            formulaConfig: formulaConfig ?? null,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat period";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Period dengan urutan ini sudah ada untuk mata pelajaran ini",
            };
        }
        return { success: false, error: message };
    }
}

// Update Period
export async function updatePeriod(
    input: UpdatePeriodInput,
): Promise<ActionResult> {
    const parsed = updatePeriodSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, name, order, formulaConfig } = parsed.data;

    try {
        await db
            .update(periods)
            .set({
                name,
                order,
                formulaConfig: formulaConfig ?? null,
                updatedAt: new Date(),
            })
            .where(eq(periods.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui period";
        return { success: false, error: message };
    }
}

// Delete Period
export async function deletePeriod(
    input: DeletePeriodInput,
): Promise<ActionResult> {
    const parsed = deletePeriodSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(periods).where(eq(periods.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus period";
        return { success: false, error: message };
    }
}

// Create Assignment
export async function createAssignment(
    input: CreateAssignmentInput,
): Promise<ActionResult> {
    const parsed = createAssignmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { periodId, name, maxScore, order } = parsed.data;

    try {
        await db.insert(assignments).values({
            id: crypto.randomUUID(),
            periodId,
            name,
            maxScore,
            order,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat tugas";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Tugas dengan urutan ini sudah ada untuk period ini",
            };
        }
        return { success: false, error: message };
    }
}

// Update Assignment
export async function updateAssignment(
    input: UpdateAssignmentInput,
): Promise<ActionResult> {
    const parsed = updateAssignmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, name, maxScore, order } = parsed.data;

    try {
        await db
            .update(assignments)
            .set({
                name,
                maxScore,
                order,
                updatedAt: new Date(),
            })
            .where(eq(assignments.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui tugas";
        return { success: false, error: message };
    }
}

// Delete Assignment
export async function deleteAssignment(
    input: DeleteAssignmentInput,
): Promise<ActionResult> {
    const parsed = deleteAssignmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(assignments).where(eq(assignments.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus tugas";
        return { success: false, error: message };
    }
}

// Save Score (single cell for per-cell auto-save on blur)
export async function saveScore(input: SaveScoreInput): Promise<ActionResult> {
    const parsed = saveScoreSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { assignmentId, studentId, score } = parsed.data;

    try {
        // Check if score record already exists
        const existing = await db
            .select()
            .from(assignmentScores)
            .where(
                and(
                    eq(assignmentScores.assignmentId, assignmentId),
                    eq(assignmentScores.studentId, studentId),
                ),
            )
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(assignmentScores)
                .set({
                    score,
                    updatedAt: new Date(),
                })
                .where(eq(assignmentScores.id, existing[0].id));
        } else {
            await db.insert(assignmentScores).values({
                id: crypto.randomUUID(),
                assignmentId,
                studentId,
                score,
            });
        }

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menyimpan skor";
        return { success: false, error: message };
    }
}

// Save Scores Batch (multiple cells at once for "Save All" button)
export async function saveScoresBatch(
    input: SaveScoresBatchInput,
): Promise<ActionResult> {
    const parsed = saveScoresBatchSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { scores } = parsed.data;

    try {
        for (const { assignmentId, studentId, score } of scores) {
            const existing = await db
                .select()
                .from(assignmentScores)
                .where(
                    and(
                        eq(assignmentScores.assignmentId, assignmentId),
                        eq(assignmentScores.studentId, studentId),
                    ),
                )
                .limit(1);

            if (existing.length > 0) {
                await db
                    .update(assignmentScores)
                    .set({
                        score,
                        updatedAt: new Date(),
                    })
                    .where(eq(assignmentScores.id, existing[0].id));
            } else {
                await db.insert(assignmentScores).values({
                    id: crypto.randomUUID(),
                    assignmentId,
                    studentId,
                    score,
                });
            }
        }

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menyimpan skor";
        return { success: false, error: message };
    }
}
