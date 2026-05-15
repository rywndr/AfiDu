import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { ReportIndexClient } from "@/components/reports/report-index-client";
import { PageHeader } from "@/components/shared/page-header";
import { requirePageAccess } from "@/lib/auth-guard";
import { getClassById, getClassSubjects } from "@/lib/queries/classes";
import { getReportIndex } from "@/lib/queries/grading";
import { getSemestersByAcademicYear } from "@/lib/queries/settings";
import { getAllSubjects } from "@/lib/queries/classes";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Subject } from "@/lib/types";

interface ReportPageParams {
    classId: string;
}

async function fetchReportContext(classId: string, semesterId?: string) {
    const classRecord = await getClassById(classId);
    if (!classRecord) return null;

    const semesters = await getSemestersByAcademicYear(
        classRecord.academicYearId,
    );

    if (semesters.length === 0) {
        return {
            classRecord,
            semesters,
            selectedSemesterId: null,
            subjects: [] as Subject[],
            reportRows: [],
        };
    }

    const activeSemesterId = semesterId ?? semesters[0].id;

    const [classSubjectRows, allSubjects] = await Promise.all([
        getClassSubjects(classId, activeSemesterId),
        getAllSubjects(),
    ]);

    const subjectIds = new Set(classSubjectRows.map((cs) => cs.subjectId));
    const relevantSubjects = allSubjects.filter((s) => subjectIds.has(s.id));

    const reportRows = await getReportIndex(classId, activeSemesterId);

    return {
        classRecord,
        semesters,
        selectedSemesterId: activeSemesterId,
        subjects: relevantSubjects,
        reportRows,
    };
}

export default async function ReportIndexPage({
    params,
    searchParams,
}: {
    params: Promise<ReportPageParams>;
    searchParams: Promise<{ semesterId?: string }>;
}) {
    await requirePageAccess("classes");

    const [resolvedParams, resolvedSearch] = await Promise.all([
        params,
        searchParams,
    ]);

    const context = await fetchReportContext(
        resolvedParams.classId,
        resolvedSearch.semesterId,
    );

    if (!context) {
        notFound();
    }

    const { classRecord, semesters, selectedSemesterId, subjects, reportRows } =
        context;

    const selectedSemester = semesters.find((s) => s.id === selectedSemesterId);

    const description = selectedSemester
        ? `${classRecord.name} · ${selectedSemester.name} · Guru: ${classRecord.teacher.name} · ${reportRows.length} siswa`
        : `${classRecord.name} · Guru: ${classRecord.teacher.name}`;

    return (
        <AppLayout title="Reports">
            <div className="space-y-6">
                <PageHeader title="Rapor Kelas" description={description}>
                    <Button
                        variant="outline"
                        size="sm"
                        render={
                            <Link href={`/classes/${resolvedParams.classId}`} />
                        }
                    >
                        <ArrowLeft className="mr-1" />
                        Kembali ke Kelas
                    </Button>
                </PageHeader>

                <ReportIndexClient
                    classId={resolvedParams.classId}
                    semesters={semesters}
                    selectedSemesterId={selectedSemesterId ?? ""}
                    subjects={subjects}
                    rows={reportRows}
                />
            </div>
        </AppLayout>
    );
}
