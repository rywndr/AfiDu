import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { StudentReportView } from "@/components/reports/student-report-view";
import { PageHeader } from "@/components/shared/page-header";
import { requirePageAccess } from "@/lib/auth-guard";
import { getClassById } from "@/lib/queries/classes";
import { getStudentReport } from "@/lib/queries/grading";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "@/components/reports/print-button";

interface StudentReportPageParams {
    classId: string;
    studentId: string;
}

export default async function StudentReportPage({
    params,
    searchParams,
}: {
    params: Promise<StudentReportPageParams>;
    searchParams: Promise<{ semesterId?: string }>;
}) {
    const [resolvedParams, resolvedSearch] = await Promise.all([
        params,
        searchParams,
    ]);

    await requirePageAccess("classes");

    const { classId, studentId } = resolvedParams;
    const semesterId = resolvedSearch.semesterId;

    if (!semesterId) {
        notFound();
    }

    const [classRecord, report] = await Promise.all([
        getClassById(classId),
        getStudentReport(classId, studentId, semesterId),
    ]);

    if (!classRecord || !report) {
        notFound();
    }

    return (
        <AppLayout title="Student Report">
            <div className="space-y-6 print:space-y-4">
                <div className="print:hidden">
                    <PageHeader
                        title={`Rapor — ${report.student.name}`}
                        description={`${report.className} · ${report.semesterName} · Guru: ${report.teacherName}`}
                    >
                        <Button
                            variant="outline"
                            size="sm"
                            render={
                                <Link
                                    href={`/classes/${classId}/reports?semesterId=${semesterId}`}
                                />
                            }
                        >
                            <ArrowLeft className="mr-1" />
                            Kembali
                        </Button>
                        <PrintButton />
                    </PageHeader>
                </div>

                <StudentReportView report={report} />
            </div>
        </AppLayout>
    );
}
