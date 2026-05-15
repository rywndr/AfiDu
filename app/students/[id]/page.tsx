import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { StudentDetailClient } from "@/components/students/student-detail-client";
import { requirePageAccess } from "@/lib/auth-guard";
import {
    getStudentWithCurrentLevel,
    getStudentLevelHistory,
    getStudentEnrollments,
} from "@/lib/queries/students";
import { getAllLevels } from "@/lib/queries/levels";
import { getAllSemesters } from "@/lib/queries/settings";

export default async function StudentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requirePageAccess("students");
    const { id } = await params;

    const [student, levelHistory, levels, semesters, enrollments] =
        await Promise.all([
            getStudentWithCurrentLevel(id),
            getStudentLevelHistory(id),
            getAllLevels(),
            getAllSemesters(),
            getStudentEnrollments(id),
        ]);

    if (!student) {
        notFound();
    }

    return (
        <AppLayout title={student.name}>
            <StudentDetailClient
                student={student}
                levelHistory={levelHistory}
                levels={levels}
                semesters={semesters}
                enrollments={enrollments}
            />
        </AppLayout>
    );
}
