import { AppLayout } from "@/components/layout/app-layout";
import { UploadMaterialForm } from "@/components/materials/upload-material-form";
import { getAllClasses } from "@/lib/queries/classes";
import { getAllLevels } from "@/lib/queries/levels";
import { requirePermission } from "@/lib/auth-guard";

export default async function UploadMaterialPage() {
    await requirePermission("materials", "create");

    const [allClasses, allLevels] = await Promise.all([
        getAllClasses(),
        getAllLevels(),
    ]);

    return (
        <AppLayout title="Upload Materi">
            <UploadMaterialForm classes={allClasses} levels={allLevels} />
        </AppLayout>
    );
}
