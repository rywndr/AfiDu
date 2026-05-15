import { AppLayout } from "@/components/layout/app-layout";
import { requirePageAccess } from "@/lib/auth-guard";
import { PaymentsOverviewClient } from "@/components/payments/payments-overview-client";
import {
    getStudentPaymentSummaries,
    getMonthlyPaymentAmountForYear,
    getAvailablePaymentYears,
} from "@/lib/queries/payments";

export default async function PaymentsPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        year?: string;
    }>;
}) {
    await requirePageAccess("payments");

    const params = await searchParams;
    const page = parseInt(params.page ?? "1", 10);
    const search = params.search ?? "";

    // Default to current year when no year filter is specified
    const currentYear = new Date().getFullYear();
    const year = params.year ? parseInt(params.year, 10) : currentYear;

    const [result, defaultAmount, years] = await Promise.all([
        getStudentPaymentSummaries({ page, pageSize: 20, search, year }),
        getMonthlyPaymentAmountForYear(year),
        getAvailablePaymentYears(),
    ]);

    return (
        <AppLayout title="Payments">
            <PaymentsOverviewClient
                result={result}
                defaultAmount={defaultAmount}
                years={years}
                initialSearch={search}
                initialYear={params.year ?? String(currentYear)}
            />
        </AppLayout>
    );
}
