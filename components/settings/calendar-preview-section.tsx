"use client";

import { CalendarDays } from "lucide-react";
import { SemesterPreviewCard } from "@/components/settings/semester-preview-card";
import type { CalendarPreview } from "@/lib/calendar-utils";

interface CalendarPreviewSectionProps {
    preview: CalendarPreview;
}

export function CalendarPreviewSection({
    preview,
}: CalendarPreviewSectionProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">
                    Preview Kalender Akademik
                </h3>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground mb-3">
                    Contoh untuk tahun {new Date().getFullYear()} berdasarkan
                    pengaturan saat ini:
                </p>
                {preview.semesters.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Tidak ada semester yang dapat dibuat dengan pengaturan
                        ini.
                    </p>
                ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                        {preview.semesters.map((sem) => (
                            <SemesterPreviewCard
                                key={sem.semesterNumber}
                                semester={sem}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
