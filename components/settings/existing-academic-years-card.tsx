"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateAcademicYearPaymentAmount } from "@/lib/actions/settings";
import { formatDate, formatRupiah } from "@/lib/utils";
import { Pencil, Check, X } from "lucide-react";
import type { AcademicYearWithSemesters } from "@/lib/types";

// Props
interface ExistingAcademicYearsCardProps {
    academicYears: AcademicYearWithSemesters[];
}

// ExistingAcademicYearsCard
// Displays existing academic years and semesters
// with editable per-year monthly payment amount
export function ExistingAcademicYearsCard({
    academicYears,
}: ExistingAcademicYearsCardProps) {
    if (academicYears.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tahun Ajaran</CardTitle>
                    <CardDescription>
                        Belum ada tahun ajaran yang dibuat.
                    </CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Tahun Ajaran yang Sudah Ada</CardTitle>
                <CardDescription>
                    Daftar tahun ajaran dan semester yang sudah dibuat. Klik
                    ikon edit untuk mengubah biaya bulanan per tahun ajaran.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tahun</TableHead>
                            <TableHead>Mulai</TableHead>
                            <TableHead>Selesai</TableHead>
                            <TableHead>Jumlah Semester</TableHead>
                            <TableHead>Biaya Bulanan</TableHead>
                            <TableHead>Semester</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {academicYears.map((ay) => (
                            <AcademicYearRow key={ay.id} academicYear={ay} />
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

// AcademicYearRow
interface AcademicYearRowProps {
    academicYear: AcademicYearWithSemesters;
}

function AcademicYearRow({ academicYear }: AcademicYearRowProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(
        String(academicYear.monthlyPaymentAmount),
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleStartEdit = useCallback(() => {
        setEditValue(String(academicYear.monthlyPaymentAmount));
        setIsEditing(true);
    }, [academicYear.monthlyPaymentAmount]);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        setEditValue(String(academicYear.monthlyPaymentAmount));
    }, [academicYear.monthlyPaymentAmount]);

    const handleSave = useCallback(async () => {
        const cleaned = editValue.replace(/[^\d]/g, "");
        const parsed = parseInt(cleaned, 10);
        const finalValue = Number.isNaN(parsed) ? 0 : parsed;

        if (finalValue === academicYear.monthlyPaymentAmount) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        const result = await updateAcademicYearPaymentAmount({
            academicYearId: academicYear.id,
            monthlyPaymentAmount: finalValue,
        });
        setIsSaving(false);

        if (result.success) {
            toast.success(
                `Biaya bulanan tahun ${academicYear.year} berhasil diperbarui`,
            );
            setIsEditing(false);
            router.refresh();
        } else {
            toast.error(result.error ?? "Gagal memperbarui biaya bulanan");
        }
    }, [editValue, academicYear, router]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            } else if (e.key === "Escape") {
                handleCancel();
            }
        },
        [handleSave, handleCancel],
    );

    return (
        <TableRow>
            <TableCell className="font-medium">{academicYear.year}</TableCell>
            <TableCell>{formatDate(academicYear.startDate)}</TableCell>
            <TableCell>{formatDate(academicYear.endDate)}</TableCell>
            <TableCell>
                <Badge variant="secondary">
                    {academicYear.semesters.length}
                </Badge>
            </TableCell>
            <TableCell>
                {isEditing ? (
                    <div className="flex items-center gap-1">
                        <div className="flex items-center gap-0">
                            <span className="inline-flex h-7 items-center rounded-l-md border border-r-0 border-input bg-muted px-1.5 text-xs text-muted-foreground">
                                Rp
                            </span>
                            <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="h-7 w-28 rounded-l-none text-xs"
                                autoFocus
                                disabled={isSaving}
                            />
                        </div>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            aria-label="Simpan"
                        >
                            <Check className="size-3.5 text-green-600" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleCancel}
                            disabled={isSaving}
                            aria-label="Batal"
                        >
                            <X className="size-3.5 text-muted-foreground" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5">
                        <span className="text-sm tabular-nums">
                            {formatRupiah(academicYear.monthlyPaymentAmount)}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleStartEdit}
                            aria-label="Edit biaya bulanan"
                        >
                            <Pencil className="size-3 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </TableCell>
            <TableCell>
                <div className="flex flex-wrap gap-1">
                    {academicYear.semesters.map((sem) => (
                        <Badge
                            key={sem.id}
                            variant="outline"
                            className="text-xs"
                        >
                            {sem.name}
                        </Badge>
                    ))}
                </div>
            </TableCell>
        </TableRow>
    );
}
