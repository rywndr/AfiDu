import { AppLayout } from "@/components/layout/app-layout";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function DocumentsPage() {
    await requirePageAccess("documents");

    return (
        <AppLayout title="Documents">
            <div>
                <p>Documents page content</p>
            </div>
        </AppLayout>
    );
}
