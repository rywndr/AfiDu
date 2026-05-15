import { notFound } from "next/navigation";
import { AppLayout } from "@/components/layout/app-layout";
import { ClassDetailClient } from "@/components/classes/class-detail-client";
import { requirePageAccess } from "@/lib/auth-guard";
import {
    getClassById,
    getClassStudents,
    getClassSubjects,
    getAllSubjects,
    getAllTeachers,
    getStudentsNotInClass,
} from "@/lib/queries/classes";
import {
    getAcademicYears,
    getSemestersByAcademicYear,
} from "@/lib/queries/settings";
import { getAllLevels } from "@/lib/queries/levels";

export default async function ClassDetailPage({
    params,
}: {
    params: Promise<{ classId: string }>;
}) {
    await requirePageAccess("classes");
    const { classId } = await params;

    const classRecord = await getClassById(classId);
    if (!classRecord) {
        notFound();
    }

    const [
        classStudentRows,
        classSubjectRows,
        allSubjects,
        allTeachers,
        academicYears,
        semesters,
        levels,
        availableStudents,
    ] = await Promise.all([
        getClassStudents(classId),
        getClassSubjects(classId),
        getAllSubjects(),
        getAllTeachers(),
        getAcademicYears(),
        getSemestersByAcademicYear(classRecord.academicYearId),
        getAllLevels(),
        getStudentsNotInClass(classId),
    ]);

    return (
        <AppLayout title={classRecord.name}>
            <ClassDetailClient
                classRecord={classRecord}
                classStudents={classStudentRows}
                classSubjects={classSubjectRows}
                allSubjects={allSubjects}
                allTeachers={allTeachers}
                academicYears={academicYears}
                semesters={semesters}
                levels={levels}
                availableStudents={availableStudents}
            />
        </AppLayout>
    );
}
