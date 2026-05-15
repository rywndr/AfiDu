"use server";

import { db } from "@/lib/db";
import { students, studentLevels } from "@/lib/db/schema/students";
import { eq, desc, sql } from "drizzle-orm";
import {
    createStudentSchema,
    updateStudentSchema,
    deleteStudentSchema,
    assignLevelSchema,
    deleteStudentLevelSchema,
    type CreateStudentInput,
    type UpdateStudentInput,
    type DeleteStudentInput,
    type AssignLevelInput,
    type DeleteStudentLevelInput,
} from "@/lib/validators/students";
import type { ActionResult } from "@/lib/types";

// Autogen student number
async function generateStudentNumber(): Promise<string> {
    // Find the highest existing AFD number
    const result = await db
        .select({ studentNumber: students.studentNumber })
        .from(students)
        .where(sql`${students.studentNumber} LIKE 'AFD%'`)
        .orderBy(desc(students.studentNumber))
        .limit(1);

    let nextNum = 1;

    if (result.length > 0) {
        const last = result[0].studentNumber;
        // Extract the numeric part after "AFD"
        const numPart = parseInt(last.replace("AFD", ""), 10);
        if (!isNaN(numPart)) {
            nextNum = numPart + 1;
        }
    }

    // Pad to at least 4 digits: AFD0001, AFD0002, and so on so forth
    return `AFD${String(nextNum).padStart(4, "0")}`;
}

// Create Student
export async function createStudent(
    input: CreateStudentInput,
): Promise<ActionResult> {
    const parsed = createStudentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const {
        name,
        gender,
        dateOfBirth,
        address,
        parentPhone,
        levelId,
        semesterId,
    } = parsed.data;

    try {
        const id = crypto.randomUUID();
        const studentNumber = await generateStudentNumber();

        await db.insert(students).values({
            id,
            name,
            studentNumber,
            gender: gender ?? null,
            dateOfBirth: dateOfBirth ?? null,
            address: address ?? null,
            parentPhone: parentPhone ?? null,
        });

        // Optionally assign initial level
        if (levelId && semesterId) {
            await db.insert(studentLevels).values({
                id: crypto.randomUUID(),
                studentId: id,
                levelId,
                semesterId,
            });
        }

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat siswa";
        if (message.includes("unique") || message.includes("duplicate")) {
            return { success: false, error: "Nomor siswa sudah digunakan" };
        }
        return { success: false, error: message };
    }
}

// Update Student
export async function updateStudent(
    input: UpdateStudentInput,
): Promise<ActionResult> {
    const parsed = updateStudentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const {
        id,
        name,
        studentNumber,
        gender,
        dateOfBirth,
        address,
        parentPhone,
    } = parsed.data;

    try {
        await db
            .update(students)
            .set({
                name,
                studentNumber,
                gender: gender ?? null,
                dateOfBirth: dateOfBirth ?? null,
                address: address ?? null,
                parentPhone: parentPhone ?? null,
                updatedAt: new Date(),
            })
            .where(eq(students.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui siswa";
        if (message.includes("unique") || message.includes("duplicate")) {
            return { success: false, error: "Nomor siswa sudah digunakan" };
        }
        return { success: false, error: message };
    }
}

// Delete Student
export async function deleteStudent(
    input: DeleteStudentInput,
): Promise<ActionResult> {
    const parsed = deleteStudentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(students).where(eq(students.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus siswa";
        if (message.includes("foreign key") || message.includes("constraint")) {
            return {
                success: false,
                error: "Siswa tidak dapat dihapus karena masih memiliki data terkait",
            };
        }
        return { success: false, error: message };
    }
}

// Delete Student Level History Entry
export async function deleteStudentLevel(
    input: DeleteStudentLevelInput,
): Promise<ActionResult> {
    const parsed = deleteStudentLevelSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db
            .delete(studentLevels)
            .where(eq(studentLevels.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menghapus riwayat level";
        return { success: false, error: message };
    }
}

// Assign Level to Student
export async function assignLevel(
    input: AssignLevelInput,
): Promise<ActionResult> {
    const parsed = assignLevelSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { studentId, levelId, semesterId } = parsed.data;

    try {
        await db.insert(studentLevels).values({
            id: crypto.randomUUID(),
            studentId,
            levelId,
            semesterId,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menetapkan level";
        if (message.includes("unique") || message.includes("duplicate")) {
            return {
                success: false,
                error: "Level untuk semester ini sudah ditetapkan",
            };
        }
        return { success: false, error: message };
    }
}
