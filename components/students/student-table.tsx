"use client";

import { useRouter } from "next/navigation";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { deleteStudent } from "@/lib/actions/students";
import { formatDate } from "@/lib/utils";
import { Eye, Pencil, Trash2, Users } from "lucide-react";
import type { Student, Level } from "@/lib/types";

interface StudentRow {
    student: Student;
    currentLevel: Level | null;
    enrolledClasses?: string[];
}

interface StudentTableProps {
    rows: StudentRow[];
    /** When undefined, the edit button is hidden (read-only mode). */
    onEdit?: (student: Student) => void;
    /** When false, the delete button is hidden. Defaults to true. */
    canDelete?: boolean;
}

export function StudentTable({
    rows,
    onEdit,
    canDelete = true,
}: StudentTableProps) {
    const router = useRouter();

    if (rows.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="Belum ada siswa"
                description="Tambahkan siswa pertama untuk mulai mengelola data siswa."
            />
        );
    }

    const handleDelete = async (id: string) => {
        const result = await deleteStudent({ id });
        if (result.success) {
            router.refresh();
        }
    };

    const showActions = !!onEdit || canDelete;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>No. Siswa</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tanggal Lahir</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Terdaftar</TableHead>
                    {showActions && (
                        <TableHead className="text-right">Aksi</TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {rows.map(({ student, currentLevel, enrolledClasses }) => (
                    <StudentTableRow
                        key={student.id}
                        student={student}
                        currentLevel={currentLevel}
                        enrolledClasses={enrolledClasses ?? []}
                        onView={() => router.push(`/students/${student.id}`)}
                        onEdit={onEdit ? () => onEdit(student) : undefined}
                        onDelete={
                            canDelete
                                ? () => handleDelete(student.id)
                                : undefined
                        }
                        showActions={showActions}
                    />
                ))}
            </TableBody>
        </Table>
    );
}

interface StudentTableRowProps {
    student: Student;
    currentLevel: Level | null;
    enrolledClasses: string[];
    onView: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    showActions: boolean;
}

function StudentTableRow({
    student,
    currentLevel,
    enrolledClasses,
    onView,
    onEdit,
    onDelete,
    showActions,
}: StudentTableRowProps) {
    return (
        <TableRow>
            <TableCell className="font-mono text-xs">
                {student.studentNumber}
            </TableCell>
            <TableCell className="font-medium">{student.name}</TableCell>
            <TableCell>
                {student.dateOfBirth ? formatDate(student.dateOfBirth) : "—"}
            </TableCell>
            <TableCell>
                {currentLevel ? (
                    <Badge variant="secondary">{currentLevel.name}</Badge>
                ) : (
                    <span className="text-muted-foreground text-xs">
                        Belum ditetapkan
                    </span>
                )}
            </TableCell>
            <TableCell>
                {enrolledClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {enrolledClasses.map((className, idx) => (
                            <Badge
                                key={idx}
                                variant="outline"
                                className="text-xs"
                            >
                                {className}
                            </Badge>
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">
                        Belum terdaftar
                    </span>
                )}
            </TableCell>
            <TableCell>{formatDate(student.enrolledAt)}</TableCell>
            {showActions && (
                <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={onView}
                            aria-label="Lihat detail siswa"
                        >
                            <Eye />
                        </Button>
                        {onEdit && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={onEdit}
                                aria-label="Edit siswa"
                            >
                                <Pencil />
                            </Button>
                        )}
                        {onDelete && (
                            <ConfirmDialog
                                title="Hapus Siswa"
                                description={`Apakah Anda yakin ingin menghapus siswa "${student.name}"? Tindakan ini tidak dapat dibatalkan.`}
                                onConfirm={onDelete}
                                trigger={
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        aria-label="Hapus siswa"
                                    >
                                        <Trash2 className="text-destructive" />
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </TableCell>
            )}
        </TableRow>
    );
}
