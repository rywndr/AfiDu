"use client";

import { SchoolSettingsCard } from "@/components/settings/school-settings-card";
import { AcademicYearCard } from "@/components/settings/academic-year-card";
import { ExistingAcademicYearsCard } from "@/components/settings/existing-academic-years-card";
import type { SchoolSettings, AcademicYearWithSemesters } from "@/lib/types";

// Props
interface SettingsFormProps {
    settings: SchoolSettings;
    academicYears: AcademicYearWithSemesters[];
}

// Main Settings
export function SettingsForm({ settings, academicYears }: SettingsFormProps) {
    return (
        <div className="space-y-8">
            <SchoolSettingsCard
                settings={settings}
                academicYears={academicYears}
            />
            <AcademicYearCard
                settings={settings}
                academicYears={academicYears}
            />
            <ExistingAcademicYearsCard academicYears={academicYears} />
        </div>
    );
}
