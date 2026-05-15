"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";
import { WarningBanner } from "@/components/shared/warning-banner";
import { SemesterPreviewCard } from "@/components/settings/semester-preview-card";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { createAcademicYear } from "@/lib/actions/settings";
import { computeCalendarPreview } from "@/lib/calendar-utils";
import { Plus } from "lucide-react";
import type { SchoolSettings, AcademicYearWithSemesters } from "@/lib/types";

// Props
interface AcademicYearCardProps {
    settings: SchoolSettings;
    academicYears: AcademicYearWithSemesters[];
}

// AcademicYearCard
export function AcademicYearCard({
    settings,
    academicYears,
}: AcademicYearCardProps) {
    const router = useRouter();
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const existingYears = useMemo(
        () => new Set(academicYears.map((ay) => ay.year)),
        [academicYears],
    );

    const yearAlreadyExists = existingYears.has(year);

    // Memoize semesterStartMonths so it doesn't change on every render,
    const semesterStartMonths = useMemo(
        () =>
            settings.semesterStartMonths?.length
                ? settings.semesterStartMonths
                : [1, 6],
        [settings.semesterStartMonths],
    );

    const preview = useMemo(() => {
        return computeCalendarPreview(year, {
            semesterDurationMonths: settings.semesterDurationMonths,
            semestersPerYear: settings.semestersPerYear,
            semesterStartMonths,
            academicYearStartMonth: settings.academicYearStartMonth,
        });
    }, [
        year,
        settings.semesterDurationMonths,
        settings.semestersPerYear,
        semesterStartMonths,
        settings.academicYearStartMonth,
    ]);

    const handleCreate = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await createAcademicYear({ year });
        setLoading(false);
        if (result.success) {
            toast.success(`Tahun ajaran ${year} berhasil dibuat`);
            router.refresh();
        } else {
            const msg = result.error ?? "Gagal membuat tahun ajaran";
            setError(msg);
            toast.error(msg);
        }
    }, [year, router]);

    const canCreate = !loading && !yearAlreadyExists && year.length === 4;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Buat Tahun Ajaran Baru</CardTitle>
                <CardDescription>
                    Buat tahun ajaran baru dan semester akan otomatis dibuat
                    berdasarkan pengaturan di atas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                    <FormField label="Tahun">
                        <Input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            min={2020}
                            max={2100}
                            className="w-32"
                        />
                    </FormField>

                    <ConfirmDialog
                        title="Buat Tahun Ajaran?"
                        description={`Tahun ajaran ${year} beserta ${preview.semesters.length} semester akan dibuat. Setelah dibuat, tahun ajaran dan semester TIDAK DAPAT diedit atau dihapus. Pastikan pengaturan semester sudah benar sebelum melanjutkan.`}
                        confirmLabel="Ya, Buat Sekarang"
                        cancelLabel="Batal"
                        variant="default"
                        onConfirm={handleCreate}
                        trigger={
                            <Button disabled={!canCreate}>
                                <Plus className="mr-1" />
                                {loading ? "Membuat..." : "Buat Tahun Ajaran"}
                            </Button>
                        }
                    />
                </div>

                <WarningBanner
                    variant="amber"
                    title="Perhatian"
                    description={
                        <>
                            Setelah tahun ajaran dibuat, data tahun ajaran dan
                            semester yang terkait{" "}
                            <strong>tidak dapat diedit atau dihapus</strong>.
                            Pastikan semua pengaturan sudah benar sebelum
                            membuat tahun ajaran baru.
                        </>
                    }
                />

                {yearAlreadyExists && (
                    <p className="text-sm text-yellow-600">
                        Tahun ajaran {year} sudah ada.
                    </p>
                )}

                {!yearAlreadyExists && year.length === 4 && (
                    <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">
                            Preview semester yang akan dibuat:
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {preview.semesters.map((sem) => (
                                <SemesterPreviewCard
                                    key={sem.semesterNumber}
                                    semester={sem}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}
            </CardContent>
        </Card>
    );
}
