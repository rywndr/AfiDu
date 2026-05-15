"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { PaymentAmountInput } from "@/components/shared/payment-amount-input";
import { SemesterStartMonthsSection } from "@/components/settings/semester-start-months-section";
import { CalendarPreviewSection } from "@/components/settings/calendar-preview-section";
import { upsertSchoolSettings } from "@/lib/actions/settings";
import { zodResolver } from "@/lib/zod-resolver";
import {
    updateSchoolSettingsSchema,
    type UpdateSchoolSettingsInput,
} from "@/lib/validators/settings";
import { computeCalendarPreview } from "@/lib/calendar-utils";
import { getMonthName } from "@/lib/utils";
import {
    buildDefaultStartMonths,
    adjustStartMonthsArray,
} from "@/lib/school-settings-utils";
import { Save } from "lucide-react";
import type { SchoolSettings, AcademicYearWithSemesters } from "@/lib/types";

// Props
interface SchoolSettingsCardProps {
    settings: SchoolSettings;
    academicYears: AcademicYearWithSemesters[];
}

// SchoolSettingsCard
export function SchoolSettingsCard({
    settings,
    academicYears,
}: SchoolSettingsCardProps) {
    const router = useRouter();
    const [serverError, setServerError] = useState<string | null>(null);
    const hasExistingSemesters = academicYears.some(
        (ay) => ay.semesters.length > 0,
    );

    const defaultStartMonths = settings.semesterStartMonths?.length
        ? settings.semesterStartMonths
        : buildDefaultStartMonths(
              settings.semestersPerYear,
              settings.semesterDurationMonths,
          );

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateSchoolSettingsInput>({
        resolver: zodResolver(updateSchoolSettingsSchema),
        defaultValues: {
            semesterDurationMonths: settings.semesterDurationMonths,
            semestersPerYear: settings.semestersPerYear,
            semesterStartMonths: defaultStartMonths,
            academicYearStartMonth: settings.academicYearStartMonth,
            monthlyPaymentAmount: settings.monthlyPaymentAmount,
        },
    });

    const watchedValues = watch();

    // Calendar preview
    const calendarPreview = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const startMonths =
            watchedValues.semesterStartMonths ?? defaultStartMonths;
        return computeCalendarPreview(String(currentYear), {
            semesterDurationMonths: watchedValues.semesterDurationMonths,
            semestersPerYear: watchedValues.semestersPerYear,
            semesterStartMonths: startMonths,
            academicYearStartMonth:
                startMonths[0] ?? watchedValues.academicYearStartMonth,
        });
    }, [
        watchedValues.semesterDurationMonths,
        watchedValues.semestersPerYear,
        watchedValues.semesterStartMonths,
        watchedValues.academicYearStartMonth,
        defaultStartMonths,
    ]);

    // Validate semester start month ordering
    const semesterOrderError = useMemo(() => {
        const months = watchedValues.semesterStartMonths;
        if (!months || months.length < 2) return null;
        for (let i = 1; i < months.length; i++) {
            if (months[i] <= months[i - 1]) {
                return `Semester ${i + 1} (bulan ${getMonthName(months[i])}) tidak boleh dimulai sebelum atau bersamaan dengan Semester ${i} (bulan ${getMonthName(months[i - 1])}). Pastikan bulan mulai setiap semester berurutan.`;
            }
        }
        // Check that semester N end doesn't overlap semester N+1 start
        const duration = watchedValues.semesterDurationMonths;
        for (let i = 0; i < months.length - 1; i++) {
            const endMonth = months[i] + duration - 1;
            if (endMonth >= months[i + 1]) {
                return `Semester ${i + 1} berakhir di bulan ${getMonthName(((endMonth - 1) % 12) + 1)} tetapi Semester ${i + 2} dimulai di bulan ${getMonthName(months[i + 1])}. Semester saling tumpang tindih.`;
            }
        }
        return null;
    }, [
        watchedValues.semesterStartMonths,
        watchedValues.semesterDurationMonths,
    ]);

    const onSubmit = useCallback(
        async (data: UpdateSchoolSettingsInput) => {
            setServerError(null);
            const result = await upsertSchoolSettings(data);
            if (result.success) {
                toast.success("Pengaturan berhasil disimpan!");
                router.refresh();
            } else {
                const msg = result.error ?? "Gagal menyimpan pengaturan";
                setServerError(msg);
                toast.error(msg);
            }
        },
        [router],
    );

    // If semestersPerYear changes, ensure semesterStartMonths array matches
    const handleSemestersPerYearChange = useCallback(
        (newCount: number) => {
            const current = watchedValues.semesterStartMonths ?? [];
            const updated = adjustStartMonthsArray(
                current,
                newCount,
                watchedValues.semesterDurationMonths,
            );
            setValue("semestersPerYear", newCount, { shouldDirty: true });
            setValue("semesterStartMonths", updated, { shouldDirty: true });
        },
        [
            watchedValues.semesterStartMonths,
            watchedValues.semesterDurationMonths,
            setValue,
        ],
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Pengaturan Umum Bimbel</CardTitle>
                <CardDescription>
                    Konfigurasi durasi semester, bulan mulai setiap semester,
                    dan biaya bulanan. Perubahan akan mempengaruhi pembuatan
                    tahun ajaran baru.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {hasExistingSemesters && isDirty && (
                        <WarningBanner
                            variant="yellow"
                            title="Perubahan Pengaturan"
                            description="Sudah ada semester yang dibuat berdasarkan pengaturan sebelumnya. Mengubah pengaturan ini tidak akan mempengaruhi semester yang sudah ada, tetapi akan mempengaruhi pembuatan tahun ajaran baru berikutnya."
                        />
                    )}

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField
                            label="Durasi Semester (bulan)"
                            error={errors.semesterDurationMonths?.message}
                        >
                            <Input
                                type="number"
                                {...register("semesterDurationMonths", {
                                    valueAsNumber: true,
                                })}
                                min={1}
                                max={12}
                            />
                        </FormField>

                        <FormField
                            label="Jumlah Semester per Tahun"
                            error={errors.semestersPerYear?.message}
                        >
                            <Input
                                type="number"
                                value={watchedValues.semestersPerYear}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1 && val <= 4) {
                                        handleSemestersPerYearChange(val);
                                    }
                                }}
                                min={1}
                                max={4}
                            />
                        </FormField>

                        <FormField
                            label="Biaya Bulanan Siswa"
                            error={errors.monthlyPaymentAmount?.message}
                        >
                            <PaymentAmountInput
                                value={watchedValues.monthlyPaymentAmount}
                                onChange={(val) =>
                                    setValue("monthlyPaymentAmount", val, {
                                        shouldDirty: true,
                                    })
                                }
                            />
                        </FormField>
                    </div>

                    <SemesterStartMonthsSection
                        semestersPerYear={watchedValues.semestersPerYear}
                        semesterStartMonths={watchedValues.semesterStartMonths}
                        semesterDurationMonths={
                            watchedValues.semesterDurationMonths
                        }
                        onChange={(months) => {
                            setValue("semesterStartMonths", months, {
                                shouldDirty: true,
                            });
                            // Auto-sync academicYearStartMonth to first semester start
                            setValue("academicYearStartMonth", months[0] ?? 1, {
                                shouldDirty: true,
                            });
                        }}
                    />

                    {semesterOrderError && (
                        <WarningBanner
                            variant="destructive"
                            title="Urutan Semester Tidak Valid"
                            description={semesterOrderError}
                        />
                    )}

                    <CalendarPreviewSection preview={calendarPreview} />

                    {serverError && (
                        <p className="text-sm text-destructive">
                            {serverError}
                        </p>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={
                                isSubmitting || !isDirty || !!semesterOrderError
                            }
                        >
                            <Save className="mr-1" />
                            {isSubmitting
                                ? "Menyimpan..."
                                : "Simpan Pengaturan"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
