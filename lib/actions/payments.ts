"use server";

import { db } from "@/lib/db";
import { payments, paymentInstallments } from "@/lib/db/schema/payments";
import {
    studyMaterials,
    studyMaterialAssignments,
} from "@/lib/db/schema/materials";
import { eq, and, sum } from "drizzle-orm";
import {
    upsertPaymentSchema,
    deletePaymentSchema,
    createMaterialSchema,
    updateMaterialSchema,
    deleteMaterialSchema,
    assignMaterialSchema,
    removeMaterialAssignmentSchema,
    addInstallmentSchema,
    deleteInstallmentSchema,
    type UpsertPaymentInput,
    type DeletePaymentInput,
    type CreateMaterialInput,
    type UpdateMaterialInput,
    type DeleteMaterialInput,
    type AssignMaterialInput,
    type RemoveMaterialAssignmentInput,
    type AddInstallmentInput,
    type DeleteInstallmentInput,
} from "@/lib/validators/classes";
import type { ActionResult, ActionResultWithData } from "@/lib/types";

// Upsert Payment (create if no record exists for student/month/year, else update)
export async function upsertPayment(
    input: UpsertPaymentInput,
): Promise<ActionResultWithData<{ paymentId: string }>> {
    const parsed = upsertPaymentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { studentId, amount, month, year, status, paidAmount, notes } =
        parsed.data;

    try {
        const existing = await db
            .select()
            .from(payments)
            .where(
                and(
                    eq(payments.studentId, studentId),
                    eq(payments.month, month),
                    eq(payments.year, year),
                ),
            )
            .limit(1);

        if (existing.length > 0) {
            await db
                .update(payments)
                .set({
                    amount,
                    status,
                    paidAmount,
                    paidAt: status === "paid" ? new Date() : null,
                    notes: notes ?? null,
                    updatedAt: new Date(),
                })
                .where(eq(payments.id, existing[0].id));

            return { success: true, data: { paymentId: existing[0].id } };
        } else {
            const newId = crypto.randomUUID();
            await db.insert(payments).values({
                id: newId,
                studentId,
                amount,
                month,
                year,
                status,
                paidAmount,
                paidAt: status === "paid" ? new Date() : null,
                notes: notes ?? null,
            });

            return { success: true, data: { paymentId: newId } };
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menyimpan pembayaran";
        return { success: false, error: message, data: undefined };
    }
}

// Delete Payment
export async function deletePayment(
    input: DeletePaymentInput,
): Promise<ActionResult> {
    const parsed = deletePaymentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db.delete(payments).where(eq(payments.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menghapus pembayaran";
        return { success: false, error: message };
    }
}

// Create Study Material
export async function createMaterial(
    input: CreateMaterialInput & {
        uploadedBy: string;
        classId?: string;
        levelId?: string;
    },
): Promise<ActionResultWithData<{ id: string }>> {
    const parsed = createMaterialSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { title, description, fileUrl, fileType, fileSize } = parsed.data;

    try {
        const id = crypto.randomUUID();

        await db.insert(studyMaterials).values({
            id,
            title,
            description: description ?? null,
            fileUrl,
            fileType,
            fileSize: fileSize ?? null,
            uploadedBy: input.uploadedBy,
        });

        // If class or level is specified, create a material assignment
        if (input.classId || input.levelId) {
            await db.insert(studyMaterialAssignments).values({
                id: crypto.randomUUID(),
                materialId: id,
                classId: input.classId ?? null,
                periodId: null,
                levelId: input.levelId ?? null,
            });
        }

        return { success: true, data: { id } };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal membuat materi";
        return { success: false, error: message };
    }
}

// Update Study Material
export async function updateMaterial(
    input: UpdateMaterialInput,
): Promise<ActionResult> {
    const parsed = updateMaterialSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, title, description, fileUrl, fileType, fileSize } = parsed.data;

    try {
        await db
            .update(studyMaterials)
            .set({
                title,
                description: description ?? null,
                fileUrl,
                fileType,
                fileSize: fileSize ?? null,
                updatedAt: new Date(),
            })
            .where(eq(studyMaterials.id, id));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal memperbarui materi";
        return { success: false, error: message };
    }
}

// Delete Study Material
export async function deleteMaterial(
    input: DeleteMaterialInput,
): Promise<ActionResult> {
    const parsed = deleteMaterialSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db
            .delete(studyMaterials)
            .where(eq(studyMaterials.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus materi";
        return { success: false, error: message };
    }
}

// Assign Material to Class/Period/Level
export async function assignMaterial(
    input: AssignMaterialInput,
): Promise<ActionResult> {
    const parsed = assignMaterialSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { materialId, classId, periodId, levelId } = parsed.data;

    try {
        await db.insert(studyMaterialAssignments).values({
            id: crypto.randomUUID(),
            materialId,
            classId: classId ?? null,
            periodId: periodId ?? null,
            levelId: levelId ?? null,
        });

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menetapkan materi";
        return { success: false, error: message };
    }
}

// Remove Material Assignment
export async function removeMaterialAssignment(
    input: RemoveMaterialAssignmentInput,
): Promise<ActionResult> {
    const parsed = removeMaterialAssignmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    try {
        await db
            .delete(studyMaterialAssignments)
            .where(eq(studyMaterialAssignments.id, parsed.data.id));
        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menghapus penetapan materi";
        return { success: false, error: message };
    }
}

// Add Payment Installment
export async function addInstallment(
    input: AddInstallmentInput,
): Promise<ActionResult> {
    const parsed = addInstallmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { paymentId, amount, notes } = parsed.data;

    try {
        // Verify payment exists
        const paymentRows = await db
            .select()
            .from(payments)
            .where(eq(payments.id, paymentId))
            .limit(1);

        if (paymentRows.length === 0) {
            return { success: false, error: "Pembayaran tidak ditemukan" };
        }

        const payment = paymentRows[0];

        // Insert installment
        await db.insert(paymentInstallments).values({
            id: crypto.randomUUID(),
            paymentId,
            amount,
            notes: notes ?? null,
        });

        // Recalculate total paid from all installments
        const totalResult = await db
            .select({ total: sum(paymentInstallments.amount) })
            .from(paymentInstallments)
            .where(eq(paymentInstallments.paymentId, paymentId));

        const newPaidAmount = Number(totalResult[0]?.total ?? 0);
        const newStatus =
            newPaidAmount >= payment.amount
                ? "paid"
                : newPaidAmount > 0
                  ? "partial"
                  : "unpaid";

        await db
            .update(payments)
            .set({
                paidAmount: newPaidAmount,
                status: newStatus,
                paidAt: newStatus === "paid" ? new Date() : payment.paidAt,
                updatedAt: new Date(),
            })
            .where(eq(payments.id, paymentId));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Gagal menambahkan cicilan";
        return { success: false, error: message };
    }
}

// Delete Payment Installment
export async function deleteInstallment(
    input: DeleteInstallmentInput,
): Promise<ActionResult> {
    const parsed = deleteInstallmentSchema.safeParse(input);
    if (!parsed.success) {
        return {
            success: false,
            error: parsed.error.issues[0]?.message ?? "Input tidak valid",
        };
    }

    const { id, paymentId } = parsed.data;

    try {
        // Verify payment exists
        const paymentRows = await db
            .select()
            .from(payments)
            .where(eq(payments.id, paymentId))
            .limit(1);

        if (paymentRows.length === 0) {
            return { success: false, error: "Pembayaran tidak ditemukan" };
        }

        const payment = paymentRows[0];

        // Delete installment
        await db
            .delete(paymentInstallments)
            .where(eq(paymentInstallments.id, id));

        // Recalculate total paid from remaining installments
        const totalResult = await db
            .select({ total: sum(paymentInstallments.amount) })
            .from(paymentInstallments)
            .where(eq(paymentInstallments.paymentId, paymentId));

        const newPaidAmount = Number(totalResult[0]?.total ?? 0);
        const newStatus =
            newPaidAmount >= payment.amount
                ? "paid"
                : newPaidAmount > 0
                  ? "partial"
                  : "unpaid";

        await db
            .update(payments)
            .set({
                paidAmount: newPaidAmount,
                status: newStatus,
                paidAt: newStatus === "paid" ? new Date() : null,
                updatedAt: new Date(),
            })
            .where(eq(payments.id, paymentId));

        return { success: true };
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Gagal menghapus cicilan";
        return { success: false, error: message };
    }
}
