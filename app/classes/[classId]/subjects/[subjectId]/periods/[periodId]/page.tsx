import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { GradebookGrid } from "@/components/grading/gradebook-grid";
import { AssignmentManager } from "@/components/grading/assignment-manager";
import { PageHeader } from "@/components/shared/page-header";
import { requirePageAccess } from "@/lib/auth-guard";
import { getGradebookData } from "@/lib/queries/grading";
import {
    getClassById,
    getClassSubjectById,
    getPeriodById,
} from "@/lib/queries/classes";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface GradebookPageParams {
    classId: string;
    subjectId: string;
    periodId: string;
}

async function fetchGradebookContext(params: GradebookPageParams) {
    const [classRecord, period] = await Promise.all([
        getClassById(params.classId),
        getPeriodById(params.periodId),
    ]);

    if (!classRecord || !period) return null;

    const classSubject = await getClassSubjectById(period.classSubjectId);
    if (!classSubject) return null;

    if (classSubject.classId !== params.classId) return null;
    if (classSubject.subjectId !== params.subjectId) return null;

    const gradebookData = await getGradebookData(params.periodId);
    if (!gradebookData) return null;

    return {
        classRecord,
        classSubject,
        gradebookData,
    };
}

function buildBreadcrumbTitle(
    className: string,
    subjectName: string,
    periodName: string,
): string {
    return `${className} — ${subjectName} — ${periodName}`;
}

export default async function GradebookPage({
    params,
}: {
    params: Promise<GradebookPageParams>;
}) {
    await requirePageAccess("classes");

    const resolvedParams = await params;
    const context = await fetchGradebookContext(resolvedParams);

    if (!context) {
        notFound();
    }

    const { classRecord, classSubject, gradebookData } = context;

    const pageTitle = buildBreadcrumbTitle(
        classRecord.name,
        classSubject.subject.name,
        gradebookData.period.name,
    );

    return (
        <AppLayout title="Gradebook">
            <div className="space-y-6">
                <PageHeader
                    title={pageTitle}
                    description={`Semester: ${classSubject.semester.name} · Guru: ${classRecord.teacher.name} · ${gradebookData.students.length} siswa · ${gradebookData.assignments.length} tugas`}
                >
                    <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={
                            <Link href={`/classes/${resolvedParams.classId}`} />
                        }
                    >
                        <ArrowLeft className="mr-1" />
                        Kembali ke Kelas
                    </Button>
                </PageHeader>

                <AssignmentManager
                    periodId={resolvedParams.periodId}
                    assignments={gradebookData.assignments}
                />

                <GradebookGrid
                    periodName={gradebookData.period.name}
                    assignments={gradebookData.assignments}
                    rows={gradebookData.rows}
                />
            </div>
        </AppLayout>
    );
}
