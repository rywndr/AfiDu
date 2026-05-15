import { AppLayout } from "@/components/layout/app-layout";
import { SettingsForm } from "@/components/settings/settings-form";
import { LevelsCard } from "@/components/settings/levels-card";
import { PageHeader } from "@/components/shared/page-header";
import {
    getSchoolSettingsOrDefaults,
    getAcademicYearsWithSemesters,
} from "@/lib/queries/settings";
import { getAllLevels } from "@/lib/queries/levels";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function SettingsPage() {
    await requirePageAccess("settings");

    const [settings, academicYears, levels] = await Promise.all([
        getSchoolSettingsOrDefaults(),
        getAcademicYearsWithSemesters(),
        getAllLevels(),
    ]);

    return (
        <AppLayout title="Settings">
            <div className="space-y-6">
                <PageHeader
                    title="Pengaturan Global"
                    description="Konfigurasi pengaturan umum, tahun ajaran, dan semester."
                />
                <SettingsForm
                    settings={settings}
                    academicYears={academicYears}
                />
                <LevelsCard levels={levels} />
            </div>
        </AppLayout>
    );
}
