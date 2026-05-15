"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";
import { deleteStudent } from "@/lib/actions/students";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";
import type { StudentWithLevel } from "@/lib/types";

// Detail Item (reusable key-value pair)
interface DetailItemProps {
    label: string;
    value?: string;
    children?: React.ReactNode;
}

function DetailItem({ label, value, children }: DetailItemProps) {
    return (
        <div className="space-y-1">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {label}
            </dt>
            <dd className="text-sm font-medium">{children ?? value ?? "—"}</dd>
        </div>
    );
}

// Student Info Card
interface StudentInfoCardProps {
    student: StudentWithLevel;
    /** When undefined, edit/delete buttons are hidden (read-only mode). */
    onEdit?: () => void;
}

export function StudentInfoCard({ student, onEdit }: StudentInfoCardProps) {
    const router = useRouter();

    const handleDelete = useCallback(async () => {
        const result = await deleteStudent({ id: student.id });
        if (result.success) {
            router.push("/students");
        }
    }, [student.id, router]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between">
                    <div>
                        <CardTitle className="text-xl">
                            {student.name}
                        </CardTitle>
                        <CardDescription className="font-mono">
                            {student.studentNumber}
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/students")}
                        >
                            <ArrowLeft className="mr-1" />
                            Kembali
                        </Button>
                        {onEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEdit}
                            >
                                <Pencil className="mr-1" />
                                Edit
                            </Button>
                        )}
                        {onEdit && (
                            <ConfirmDialog
                                title="Hapus Siswa"
                                description={`Apakah Anda yakin ingin menghapus siswa "${student.name}"? Semua data terkait akan ikut terhapus.`}
                                onConfirm={handleDelete}
                                trigger={
                                    <Button variant="destructive" size="sm">
                                        <Trash2 className="mr-1" />
                                        Hapus
                                    </Button>
                                }
                            />
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem
                        label="Jenis Kelamin"
                        value={
                            student.gender === "male"
                                ? "Laki-laki"
                                : student.gender === "female"
                                  ? "Perempuan"
                                  : "—"
                        }
                    />
                    <DetailItem
                        label="Tanggal Lahir"
                        value={
                            student.dateOfBirth
                                ? formatDate(student.dateOfBirth)
                                : "—"
                        }
                    />
                    <DetailItem
                        label="Tanggal Terdaftar"
                        value={formatDate(student.enrolledAt)}
                    />
                    <DetailItem label="Alamat" value={student.address ?? "—"} />
                    <DetailItem
                        label="No. Telepon Orang Tua"
                        value={student.parentPhone ?? "—"}
                    />
                    <DetailItem label="Level Saat Ini">
                        {student.currentLevel ? (
                            <Badge variant="secondary">
                                {student.currentLevel.name}
                            </Badge>
                        ) : (
                            <span className="text-muted-foreground">
                                Belum ditetapkan
                            </span>
                        )}
                    </DetailItem>
                </dl>
            </CardContent>
        </Card>
    );
}
