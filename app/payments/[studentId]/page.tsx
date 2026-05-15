import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { StudentPaymentsClient } from "@/components/payments/student-payments-client";
import { requirePageAccess } from "@/lib/auth-guard";
import { getStudentById } from "@/lib/queries/students";
import {
    getPaymentsByStudentWithInstallments,
    getMonthlyPaymentAmountForYear,
    getAvailablePaymentYears,
} from "@/lib/queries/payments";

export default async function StudentPaymentsPage({
    params,
    searchParams,
}: {
    params: Promise<{ studentId: string }>;
    searchParams: Promise<{ year?: string }>;
}) {
    await requirePageAccess("payments");

    const [{ studentId }, resolvedSearch] = await Promise.all([
        params,
        searchParams,
    ]);

    // Default to current year when no year filter is specified
    const currentYear = new Date().getFullYear();
    const selectedYear = resolvedSearch.year
        ? parseInt(resolvedSearch.year, 10)
        : currentYear;

    const [student, payments, defaultAmount, years] = await Promise.all([
        getStudentById(studentId),
        getPaymentsByStudentWithInstallments(studentId),
        getMonthlyPaymentAmountForYear(selectedYear),
        getAvailablePaymentYears(),
    ]);

    if (!student) {
        notFound();
    }

    // Filter payments by the selected year
    const filteredPayments = payments.filter((p) => p.year === selectedYear);

    // years already includes current year + all academic years from getAvailablePaymentYears
    const yearOptions = years;

    return (
        <AppLayout title={`Pembayaran - ${student.name}`}>
            <StudentPaymentsClient
                student={student}
                payments={filteredPayments}
                defaultAmount={defaultAmount}
                years={yearOptions}
                selectedYear={selectedYear}
            />
        </AppLayout>
    );
}
