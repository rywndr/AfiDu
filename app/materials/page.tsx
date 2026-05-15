import { AppLayout } from "@/components/layout/app-layout";
import { MaterialsPageClient } from "@/components/materials/materials-page-client";
import { getMaterials } from "@/lib/queries/materials";
import { getAllClasses } from "@/lib/queries/classes";
import { getAllLevels } from "@/lib/queries/levels";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function MaterialsPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        fileType?: string;
        classId?: string;
        levelId?: string;
    }>;
}) {
    await requirePageAccess("materials");

    const params = await searchParams;
    const page = parseInt(params.page ?? "1", 10);
    const search = params.search ?? "";
    const fileType = params.fileType as "pdf" | "ppt" | "pptx" | undefined;
    const classId = params.classId ?? undefined;
    const levelId = params.levelId ?? undefined;

    const [result, allClasses, allLevels] = await Promise.all([
        getMaterials({
            page,
            pageSize: 20,
            search,
            fileType,
            classId,
            levelId,
        }),
        getAllClasses(),
        getAllLevels(),
    ]);

    return (
        <AppLayout title="Materials">
            <MaterialsPageClient
                result={result}
                classes={allClasses}
                levels={allLevels}
                initialSearch={search}
                initialFileType={params.fileType ?? ""}
                initialClassId={params.classId ?? ""}
                initialLevelId={params.levelId ?? ""}
            />
        </AppLayout>
    );
}
