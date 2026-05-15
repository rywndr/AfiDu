"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EditClassDialog } from "@/components/classes/edit-class-dialog";
import { ClassStudentsCard } from "@/components/classes/class-students-card";
import { ClassSubjectsCard } from "@/components/classes/class-subjects-card";
import { deleteClass } from "@/lib/actions/classes";
import { useCanUpdate, useCanDelete } from "@/lib/hooks/use-permission";
import { ArrowLeft, Pencil, BarChart3, Trash2 } from "lucide-react";
import type {
    ClassWithDetails,
    ClassStudent,
    ClassSubjectWithDetails,
    Subject,
    AcademicYear,
    Semester,
    Level,
    Student,
} from "@/lib/types";

// Props
interface ClassDetailClientProps {
    classRecord: ClassWithDetails;
    classStudents: ClassStudent[];
    classSubjects: ClassSubjectWithDetails[];
    allSubjects: Subject[];
    allTeachers: { id: string; name: string; email: string }[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    levels: Level[];
    availableStudents: Student[];
}

// Main Component
export function ClassDetailClient({
    classRecord,
    classStudents,
    classSubjects,
    allSubjects,
    allTeachers,
    academicYears,
    semesters,
    levels,
    availableStudents,
}: ClassDetailClientProps) {
    const router = useRouter();
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const canUpdate = useCanUpdate("classes");
    const canDelete = useCanDelete("classes");

    const handleDeleteClass = useCallback(async () => {
        const result = await deleteClass({ id: classRecord.id });
        if (result.success) {
            router.push("/classes");
        }
    }, [classRecord.id, router]);

    return (
        <div className="space-y-6">
            <PageHeader
                title={classRecord.name}
                description={`Tahun Ajaran ${classRecord.academicYear.year} · Guru: ${classRecord.teacher.name} · ${classRecord.studentCount}/${classRecord.capacity} siswa`}
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push("/classes")}
                >
                    <ArrowLeft className="mr-1" />
                    Kembali
                </Button>
                {canUpdate && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditDialogOpen(true)}
                    >
                        <Pencil className="mr-1" />
                        Edit
                    </Button>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                        router.push(`/classes/${classRecord.id}/reports`)
                    }
                >
                    <BarChart3 className="mr-1" />
                    Rapor
                </Button>
                {canDelete && (
                    <ConfirmDialog
                        title="Hapus Kelas"
                        description={`Apakah Anda yakin ingin menghapus kelas "${classRecord.name}"? Semua data terkait (siswa terdaftar, mata pelajaran, period, dan nilai) akan ikut terhapus.`}
                        confirmLabel="Hapus"
                        onConfirm={handleDeleteClass}
                        trigger={
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-1" />
                                Hapus
                            </Button>
                        }
                    />
                )}
            </PageHeader>

            <ClassStudentsCard
                classId={classRecord.id}
                students={classStudents}
                availableStudents={canUpdate ? availableStudents : []}
                classCapacity={classRecord.capacity}
                readOnly={!canUpdate}
            />

            <ClassSubjectsCard
                classId={classRecord.id}
                classSubjects={classSubjects}
                allSubjects={allSubjects}
                semesters={semesters}
                levels={levels}
                readOnly={!canUpdate}
            />

            {canUpdate && (
                <EditClassDialog
                    open={editDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    classRecord={classRecord}
                    academicYears={academicYears}
                    allTeachers={allTeachers}
                />
            )}
        </div>
    );
}
