import { AppLayout } from "@/components/layout/app-layout";
import { CreateClassForm } from "@/components/classes/create-class-form";
import { getAcademicYears } from "@/lib/queries/settings";
import { getAllTeachers } from "@/lib/queries/classes";
import { requirePermission } from "@/lib/auth-guard";

export default async function NewClassPage() {
    await requirePermission("classes", "create");

    const [academicYears, teachers] = await Promise.all([
        getAcademicYears(),
        getAllTeachers(),
    ]);

    return (
        <AppLayout title="Buat Kelas Baru">
            <CreateClassForm
                academicYears={academicYears}
                teachers={teachers}
            />
        </AppLayout>
    );
}
