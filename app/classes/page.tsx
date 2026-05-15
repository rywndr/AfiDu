import { AppLayout } from "@/components/layout/app-layout";
import { ClassesPageClient } from "@/components/classes/classes-page-client";
import { getClasses, getAllTeachers } from "@/lib/queries/classes";
import { getAcademicYears } from "@/lib/queries/settings";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function ClassesPage({
    searchParams,
}: {
    searchParams: Promise<{
        page?: string;
        search?: string;
        academicYearId?: string;
    }>;
}) {
    await requirePageAccess("classes");

    const params = await searchParams;
    const page = parseInt(params.page ?? "1", 10);
    const search = params.search ?? "";

    // Fetch academic years
    const [academicYears, teachers] = await Promise.all([
        getAcademicYears(),
        getAllTeachers(),
    ]);

    // Default to current year's academic year if no filter is specified
    const currentYear = String(new Date().getFullYear());
    const currentYearAcademic = academicYears.find(
        (ay) => ay.year === currentYear,
    );
    const academicYearId =
        params.academicYearId ?? currentYearAcademic?.id ?? undefined;
    const displayAcademicYearId =
        params.academicYearId ?? currentYearAcademic?.id ?? "";

    const result = await getClasses({
        page,
        pageSize: 20,
        search,
        academicYearId,
    });

    return (
        <AppLayout title="Classes">
            <ClassesPageClient
                result={result}
                academicYears={academicYears}
                teachers={teachers}
                initialSearch={search}
                initialAcademicYearId={displayAcademicYearId}
            />
        </AppLayout>
    );
}
