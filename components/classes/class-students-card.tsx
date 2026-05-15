"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { enrollStudent, removeStudent } from "@/lib/actions/classes";
import { formatDate } from "@/lib/utils";
import { Plus, Users, Trash2, AlertTriangle } from "lucide-react";
import type { ClassStudent, Student } from "@/lib/types";

// Props
interface ClassStudentsCardProps {
    classId: string;
    students: ClassStudent[];
    availableStudents: Student[];
    /** The maximum capacity of the class (used for overloaded notice). */
    classCapacity: number;
    /** When true, hide enroll/remove actions (read-only mode for admins). */
    readOnly?: boolean;
}

// ClassStudentsCard
export function ClassStudentsCard({
    classId,
    students,
    availableStudents,
    classCapacity,
    readOnly = false,
}: ClassStudentsCardProps) {
    const router = useRouter();
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [enrolling, setEnrolling] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
    const [capacityMessage, setCapacityMessage] = useState("");

    const isOverloaded = students.length > classCapacity;

    const performEnroll = useCallback(
        async (force: boolean) => {
            if (!selectedStudentId) return;
            setEnrolling(true);
            setError(null);

            const result = await enrollStudent({
                classId,
                studentId: selectedStudentId,
                forceEnroll: force,
            });

            setEnrolling(false);

            if (result.success) {
                setSelectedStudentId("");
                setCapacityDialogOpen(false);
                router.refresh();
            } else if (
                result.error?.startsWith("CAPACITY_EXCEEDED:") &&
                !force
            ) {
                // Extract user-friendly message after the code prefix
                setCapacityMessage(
                    result.error.replace("CAPACITY_EXCEEDED:", ""),
                );
                setCapacityDialogOpen(true);
            } else {
                setError(result.error ?? "Gagal mendaftarkan siswa");
            }
        },
        [classId, selectedStudentId, router],
    );

    const handleEnroll = useCallback(() => {
        performEnroll(false);
    }, [performEnroll]);

    const handleForceEnroll = useCallback(() => {
        performEnroll(true);
    }, [performEnroll]);

    const handleRemove = useCallback(
        async (studentId: string) => {
            const result = await removeStudent({ classId, studentId });
            if (result.success) {
                router.refresh();
            }
        },
        [classId, router],
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="size-5" />
                            Siswa Terdaftar
                        </CardTitle>
                        <CardDescription>
                            {students.length}/{classCapacity} siswa terdaftar di
                            kelas ini
                        </CardDescription>
                    </div>
                    {isOverloaded && (
                        <Badge
                            variant="destructive"
                            className="flex items-center gap-1"
                        >
                            <AlertTriangle className="size-3" />
                            Overloaded
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {!readOnly && availableStudents.length > 0 ? (
                    <EnrollStudentForm
                        availableStudents={availableStudents}
                        selectedStudentId={selectedStudentId}
                        onSelectStudent={setSelectedStudentId}
                        onEnroll={handleEnroll}
                        enrolling={enrolling}
                        error={error}
                    />
                ) : !readOnly && students.length > 0 ? (
                    <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-3 text-center">
                        Semua siswa sudah terdaftar di kelas ini. Tambahkan
                        siswa baru di halaman{" "}
                        <button
                            type="button"
                            onClick={() => router.push("/students")}
                            className="underline underline-offset-2 font-medium text-foreground hover:text-primary"
                        >
                            Siswa
                        </button>{" "}
                        terlebih dahulu.
                    </p>
                ) : null}

                {students.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Belum ada siswa"
                        description={
                            readOnly
                                ? "Belum ada siswa terdaftar di kelas ini."
                                : "Daftarkan siswa ke kelas ini menggunakan form di atas."
                        }
                    />
                ) : (
                    <StudentsList
                        students={students}
                        onRemove={readOnly ? undefined : handleRemove}
                    />
                )}

                {/* Inline force-enroll confirmation when class is at capacity */}
                {capacityDialogOpen && (
                    <div className="rounded-lg border border-destructive bg-destructive/5 p-4 space-y-3">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-destructive">
                                    Kelas Sudah Penuh
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {capacityMessage}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pl-7">
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleForceEnroll}
                                disabled={enrolling}
                            >
                                {enrolling
                                    ? "Mendaftarkan..."
                                    : "Tetap Daftarkan"}
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setCapacityDialogOpen(false);
                                    setCapacityMessage("");
                                }}
                                disabled={enrolling}
                            >
                                Batal
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// EnrollStudentForm
interface EnrollStudentFormProps {
    availableStudents: Student[];
    selectedStudentId: string;
    onSelectStudent: (id: string) => void;
    onEnroll: () => void;
    enrolling: boolean;
    error: string | null;
}

function EnrollStudentForm({
    availableStudents,
    selectedStudentId,
    onSelectStudent,
    onEnroll,
    enrolling,
    error,
}: EnrollStudentFormProps) {
    return (
        <div className="space-y-2">
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <Select
                        value={selectedStudentId}
                        onValueChange={(val: string | null) => {
                            if (val) onSelectStudent(val);
                        }}
                    >
                        <SelectTrigger className="w-full">
                            <span className="truncate">
                                {selectedStudentId
                                    ? (availableStudents.find(
                                          (s) => s.id === selectedStudentId,
                                      )?.name ??
                                      "Pilih siswa untuk didaftarkan...")
                                    : "Pilih siswa untuk didaftarkan..."}
                            </span>
                        </SelectTrigger>
                        <SelectContent>
                            {availableStudents.map((student) => (
                                <SelectItem key={student.id} value={student.id}>
                                    {student.name} ({student.studentNumber})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button
                    onClick={onEnroll}
                    disabled={!selectedStudentId || enrolling}
                    size="default"
                >
                    <Plus className="mr-1" />
                    {enrolling ? "Mendaftarkan..." : "Daftarkan"}
                </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// StudentsList
interface StudentsListProps {
    students: ClassStudent[];
    onRemove?: (studentId: string) => void;
}

function StudentsList({ students, onRemove }: StudentsListProps) {
    const router = useRouter();

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>No. Siswa</TableHead>
                    <TableHead>Tanggal Bergabung</TableHead>
                    {onRemove && (
                        <TableHead className="text-right">Aksi</TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {students.map((cs) => (
                    <TableRow key={cs.id}>
                        <TableCell>
                            <button
                                type="button"
                                onClick={() =>
                                    router.push(`/students/${cs.studentId}`)
                                }
                                className="font-medium hover:underline underline-offset-2 text-left"
                            >
                                {cs.student.name}
                            </button>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                            {cs.student.studentNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                            {formatDate(cs.enrolledAt)}
                        </TableCell>
                        {onRemove && (
                            <TableCell className="text-right">
                                <ConfirmDialog
                                    title="Keluarkan Siswa"
                                    description={`Apakah Anda yakin ingin mengeluarkan "${cs.student.name}" dari kelas ini?`}
                                    confirmLabel="Keluarkan"
                                    onConfirm={() => onRemove(cs.studentId)}
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            aria-label="Keluarkan siswa"
                                        >
                                            <Trash2 className="text-destructive" />
                                        </Button>
                                    }
                                />
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
