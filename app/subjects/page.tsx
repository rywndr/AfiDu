import { AppLayout } from "@/components/layout/app-layout";
import { SubjectsCard } from "@/components/settings/subjects-card";
import { getAllSubjects } from "@/lib/queries/classes";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function SubjectsPage() {
    await requirePageAccess("subjects");
    const subjects = await getAllSubjects();

    return (
        <AppLayout title="Mata Pelajaran">
            <div className="space-y-6">
                <SubjectsCard subjects={subjects} />
            </div>
        </AppLayout>
    );
}
