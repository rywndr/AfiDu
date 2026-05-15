import { db } from "@/lib/db";
import { payments, paymentInstallments } from "@/lib/db/schema/payments";
import { students } from "@/lib/db/schema/students";
import { schoolSettings, academicYears } from "@/lib/db/schema/academics";
import { eq, and, asc, desc, count, like, or, sum, SQL } from "drizzle-orm";
import type {
    Student,
    Payment,
    PaymentInstallment,
    PaymentWithStudent,
    PaymentWithInstallments,
    PaginatedResult,
} from "@/lib/types";

// Student Payment Summary (for main payments overview page)
export interface StudentPaymentSummary {
    student: Student;
    totalPayments: number;
    paidCount: number;
    partialCount: number;
    unpaidCount: number;
    totalAmount: number;
    totalPaid: number;
}

// Get all payments (paginated, with student info)
export async function getPayments(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    year?: number;
    month?: number;
    status?: "paid" | "unpaid" | "partial";
    studentId?: string;
}): Promise<PaginatedResult<PaymentWithStudent>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions: SQL[] = [];

    if (opts.search) {
        conditions.push(
            or(
                like(students.name, `%${opts.search}%`),
                like(students.studentNumber, `%${opts.search}%`),
            )!,
        );
    }
    if (opts.year) {
        conditions.push(eq(payments.year, opts.year));
    }
    if (opts.month) {
        conditions.push(eq(payments.month, opts.month));
    }
    if (opts.status) {
        conditions.push(eq(payments.status, opts.status));
    }
    if (opts.studentId) {
        conditions.push(eq(payments.studentId, opts.studentId));
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
                id: payments.id,
                studentId: payments.studentId,
                amount: payments.amount,
                month: payments.month,
                year: payments.year,
                status: payments.status,
                paidAmount: payments.paidAmount,
                paidAt: payments.paidAt,
                notes: payments.notes,
                createdAt: payments.createdAt,
                updatedAt: payments.updatedAt,
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
            .from(payments)
            .innerJoin(students, eq(payments.studentId, students.id))
            .where(whereClause)
            .orderBy(
                desc(payments.year),
                desc(payments.month),
                asc(students.name),
            )
            .limit(pageSize)
            .offset(offset),
        db
            .select({ total: count() })
            .from(payments)
            .innerJoin(students, eq(payments.studentId, students.id))
            .where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    return {
        data: data as PaymentWithStudent[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}

// Get a single payment by ID (with student info)
export async function getPaymentById(
    id: string,
): Promise<PaymentWithStudent | null> {
    const rows = await db
        .select({
            id: payments.id,
            studentId: payments.studentId,
            amount: payments.amount,
            month: payments.month,
            year: payments.year,
            status: payments.status,
            paidAmount: payments.paidAmount,
            paidAt: payments.paidAt,
            notes: payments.notes,
            createdAt: payments.createdAt,
            updatedAt: payments.updatedAt,
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
        .from(payments)
        .innerJoin(students, eq(payments.studentId, students.id))
        .where(eq(payments.id, id))
        .limit(1);

    return (rows[0] as PaymentWithStudent) ?? null;
}

// Get payments for a specific student (all months)
export async function getPaymentsByStudent(
    studentId: string,
): Promise<Payment[]> {
    const rows = await db
        .select()
        .from(payments)
        .where(eq(payments.studentId, studentId))
        .orderBy(desc(payments.year), desc(payments.month));

    return rows as Payment[];
}

// Get payment for a specific student/month/year combo
export async function getPaymentByStudentMonthYear(
    studentId: string,
    month: number,
    year: number,
): Promise<Payment | null> {
    const rows = await db
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

    return (rows[0] as Payment) ?? null;
}

// Get the global monthly payment amount from school settings
export async function getMonthlyPaymentAmount(): Promise<number> {
    const rows = await db
        .select({ amount: schoolSettings.monthlyPaymentAmount })
        .from(schoolSettings)
        .limit(1);

    return rows[0]?.amount ?? 0;
}

// Get monthly payment amount for a specific year
// Looks up the academic_year record first; falls back to the global setting
// if the year doesn't exist or its amount is 0 (legacy data before migration)
export async function getMonthlyPaymentAmountForYear(
    year: number,
): Promise<number> {
    // Try to find the academic year record
    const ayRows = await db
        .select({ amount: academicYears.monthlyPaymentAmount })
        .from(academicYears)
        .where(eq(academicYears.year, String(year)))
        .limit(1);

    if (ayRows.length > 0 && ayRows[0].amount > 0) {
        return ayRows[0].amount;
    }

    // Fallback to global setting
    return getMonthlyPaymentAmount();
}

// Get payment summary stats for a given year
export async function getPaymentSummary(year: number): Promise<{
    totalExpected: number;
    totalPaid: number;
    totalUnpaid: number;
    paidCount: number;
    unpaidCount: number;
    partialCount: number;
}> {
    const allPayments = await db
        .select({
            amount: payments.amount,
            paidAmount: payments.paidAmount,
            status: payments.status,
        })
        .from(payments)
        .where(eq(payments.year, year));

    let totalExpected = 0;
    let totalPaid = 0;
    let paidCount = 0;
    let unpaidCount = 0;
    let partialCount = 0;

    for (const p of allPayments) {
        totalExpected += p.amount;
        totalPaid += p.paidAmount;

        if (p.status === "paid") paidCount++;
        else if (p.status === "unpaid") unpaidCount++;
        else if (p.status === "partial") partialCount++;
    }

    return {
        totalExpected,
        totalPaid,
        totalUnpaid: totalExpected - totalPaid,
        paidCount,
        unpaidCount,
        partialCount,
    };
}

// Get distinct years that have payment records (for year filter dropdown)
export async function getPaymentYears(): Promise<number[]> {
    const rows = await db
        .selectDistinct({ year: payments.year })
        .from(payments)
        .orderBy(desc(payments.year));

    return rows.map((r) => r.year);
}

// Get all available years for payment filters. Merges:
//   1. Years from existing payment records
//   2. Years from academic years created in settings
//   3. The current calendar year (always present)
// This ensures the dropdown always shows every academic year the admin has
// created, even if no payments exist for that year yet.
export async function getAvailablePaymentYears(): Promise<number[]> {
    const [paymentYearRows, academicYearRows] = await Promise.all([
        db.selectDistinct({ year: payments.year }).from(payments),
        db.select({ year: academicYears.year }).from(academicYears),
    ]);

    const yearSet = new Set<number>();

    // Always include the current calendar year
    yearSet.add(new Date().getFullYear());

    // Add years from payment records
    for (const row of paymentYearRows) {
        yearSet.add(row.year);
    }

    // Add years from academic years
    for (const row of academicYearRows) {
        const parsed = parseInt(row.year, 10);
        if (!isNaN(parsed)) {
            yearSet.add(parsed);
        }
    }

    // Return sorted descending
    return Array.from(yearSet).sort((a, b) => b - a);
}

// Get installments for a specific payment
export async function getInstallmentsByPayment(
    paymentId: string,
): Promise<PaymentInstallment[]> {
    const rows = await db
        .select()
        .from(paymentInstallments)
        .where(eq(paymentInstallments.paymentId, paymentId))
        .orderBy(desc(paymentInstallments.paidAt));

    return rows as PaymentInstallment[];
}

// Get a payment with its installments
export async function getPaymentWithInstallments(
    paymentId: string,
): Promise<PaymentWithInstallments | null> {
    const paymentRows = await db
        .select()
        .from(payments)
        .where(eq(payments.id, paymentId))
        .limit(1);

    if (paymentRows.length === 0) return null;

    const installments = await getInstallmentsByPayment(paymentId);

    return {
        ...(paymentRows[0] as Payment),
        installments,
    };
}

// Get all payments for a student with installments
export async function getPaymentsByStudentWithInstallments(
    studentId: string,
): Promise<PaymentWithInstallments[]> {
    const paymentRows = await db
        .select()
        .from(payments)
        .where(eq(payments.studentId, studentId))
        .orderBy(desc(payments.year), desc(payments.month));

    if (paymentRows.length === 0) return [];

    const paymentIds = paymentRows.map((p) => p.id);

    const allInstallments = await db
        .select()
        .from(paymentInstallments)
        .where(
            or(
                ...paymentIds.map((id) =>
                    eq(paymentInstallments.paymentId, id),
                ),
            )!,
        )
        .orderBy(desc(paymentInstallments.paidAt));

    const installmentsByPayment = new Map<string, PaymentInstallment[]>();
    for (const inst of allInstallments) {
        const existing = installmentsByPayment.get(inst.paymentId) ?? [];
        existing.push(inst as PaymentInstallment);
        installmentsByPayment.set(inst.paymentId, existing);
    }

    return paymentRows.map((p) => ({
        ...(p as Payment),
        installments: installmentsByPayment.get(p.id) ?? [],
    }));
}

// Get student payment summaries (aggregated per student, for overview page)
export async function getStudentPaymentSummaries(opts: {
    page?: number;
    pageSize?: number;
    search?: string;
    year?: number;
}): Promise<PaginatedResult<StudentPaymentSummary>> {
    const page = opts.page ?? 1;
    const pageSize = opts.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    // Get all students (with optional search filter)
    const conditions: SQL[] = [];
    if (opts.search) {
        conditions.push(
            or(
                like(students.name, `%${opts.search}%`),
                like(students.studentNumber, `%${opts.search}%`),
            )!,
        );
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    const [allStudents, totalResult] = await Promise.all([
        db
            .select()
            .from(students)
            .where(whereClause)
            .orderBy(asc(students.name))
            .limit(pageSize)
            .offset(offset),
        db.select({ total: count() }).from(students).where(whereClause),
    ]);

    const total = totalResult[0]?.total ?? 0;

    // For each student, aggregate their payment data
    const summaries: StudentPaymentSummary[] = [];

    for (const student of allStudents) {
        const paymentConditions: SQL[] = [eq(payments.studentId, student.id)];
        if (opts.year) {
            paymentConditions.push(eq(payments.year, opts.year));
        }

        const paymentWhere =
            paymentConditions.length > 1
                ? and(...paymentConditions)
                : paymentConditions[0];

        const aggregation = await db
            .select({
                totalPayments: count(),
                totalAmount: sum(payments.amount),
                totalPaid: sum(payments.paidAmount),
            })
            .from(payments)
            .where(paymentWhere);

        const statusCounts = await db
            .select({
                status: payments.status,
                cnt: count(),
            })
            .from(payments)
            .where(paymentWhere)
            .groupBy(payments.status);

        const statusMap: Record<string, number> = {};
        for (const row of statusCounts) {
            statusMap[row.status] = row.cnt;
        }

        summaries.push({
            student: student as Student,
            totalPayments: aggregation[0]?.totalPayments ?? 0,
            paidCount: statusMap["paid"] ?? 0,
            partialCount: statusMap["partial"] ?? 0,
            unpaidCount: statusMap["unpaid"] ?? 0,
            totalAmount: Number(aggregation[0]?.totalAmount ?? 0),
            totalPaid: Number(aggregation[0]?.totalPaid ?? 0),
        });
    }

    return {
        data: summaries,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
    };
}
