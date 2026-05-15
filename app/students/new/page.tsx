import { AppLayout } from "@/components/layout/app-layout";
import { CreateStudentForm } from "@/components/students/create-student-form";
import { getAllLevels } from "@/lib/queries/levels";
import { getAllSemesters } from "@/lib/queries/settings";
import { requirePermission } from "@/lib/auth-guard";

export default async function NewStudentPage() {
    await requirePermission("students", "create");

    const [levels, semesters] = await Promise.all([
        getAllLevels(),
        getAllSemesters(),
    ]);

    return (
        <AppLayout title="Tambah Siswa Baru">
            <CreateStudentForm levels={levels} semesters={semesters} />
        </AppLayout>
    );
}
