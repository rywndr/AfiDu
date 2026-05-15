"use client";

import { useState, useCallback } from "react";
import {
    StudentInfoCard,
    LevelHistoryCard,
    EnrolledClassesCard,
} from "@/components/students/student-detail-card";
import { StudentFormDialog } from "@/components/students/student-form-dialog";
import { AssignLevelDialog } from "@/components/students/assign-level-dialog";
import { useCanUpdate } from "@/lib/hooks/use-permission";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import type {
    StudentWithLevel,
    StudentLevelRecord,
    StudentEnrollment,
    Level,
    Semester,
} from "@/lib/types";

interface StudentDetailClientProps {
    student: StudentWithLevel;
    levelHistory: StudentLevelRecord[];
    enrollments: StudentEnrollment[];
    levels: Level[];
    semesters: Semester[];
}

export function StudentDetailClient({
    student,
    levelHistory,
    enrollments,
    levels,
    semesters,
}: StudentDetailClientProps) {
    const canUpdate = useCanUpdate("students");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [assignLevelOpen, setAssignLevelOpen] = useState(false);

    const handleEdit = useCallback(() => {
        setDialogOpen(true);
    }, []);

    const handleDialogClose = useCallback((open: boolean) => {
        setDialogOpen(open);
    }, []);

    return (
        <div className="space-y-6">
            <StudentInfoCard
                student={student}
                onEdit={canUpdate ? handleEdit : undefined}
            />

            <EnrolledClassesCard enrollments={enrollments} />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold">Riwayat Level</h3>
                        <p className="text-sm text-muted-foreground">
                            Progres level siswa per semester
                        </p>
                    </div>
                    {canUpdate && (
                        <Button
                            size="sm"
                            onClick={() => setAssignLevelOpen(true)}
                        >
                            <GraduationCap className="mr-1" />
                            Tetapkan Level
                        </Button>
                    )}
                </div>
                <LevelHistoryCard records={levelHistory} />
            </div>

            {canUpdate && (
                <>
                    <StudentFormDialog
                        open={dialogOpen}
                        onOpenChange={handleDialogClose}
                        student={student}
                    />

                    <AssignLevelDialog
                        open={assignLevelOpen}
                        onOpenChange={setAssignLevelOpen}
                        studentId={student.id}
                        studentName={student.name}
                        levels={levels}
                        semesters={semesters}
                    />
                </>
            )}
        </div>
    );
}
