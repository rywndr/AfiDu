"use client";

import { useCallback } from "react";
import { FormField } from "@/components/shared/form-field";
import { MonthSelect } from "@/components/shared/month-select";

interface SemesterStartMonthsSectionProps {
    semestersPerYear: number;
    semesterStartMonths: number[];
    semesterDurationMonths: number;
    onChange: (months: number[]) => void;
}

const PARITY_LABELS = ["Ganjil", "Genap", "Ganjil", "Genap"];

export function SemesterStartMonthsSection({
    semestersPerYear,
    semesterStartMonths,
    semesterDurationMonths,
    onChange,
}: SemesterStartMonthsSectionProps) {
    const handleChange = useCallback(
        (index: number, value: number) => {
            const updated = [...semesterStartMonths];
            updated[index] = value;
            onChange(updated);
        },
        [semesterStartMonths, onChange],
    );

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-medium">
                Bulan Mulai Setiap Semester
            </h3>
            <p className="text-xs text-muted-foreground">
                Atur bulan mulai untuk setiap semester. Setiap semester
                berlangsung selama {semesterDurationMonths} bulan dari bulan
                mulai yang ditentukan.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: semestersPerYear }, (_, i) => (
                    <FormField
                        key={i}
                        label={`Semester ${i + 1} (${PARITY_LABELS[i] ?? (i % 2 === 0 ? "Ganjil" : "Genap")})`}
                    >
                        <MonthSelect
                            value={semesterStartMonths[i] ?? 1}
                            onChange={(val) => handleChange(i, val)}
                        />
                    </FormField>
                ))}
            </div>
        </div>
    );
}
