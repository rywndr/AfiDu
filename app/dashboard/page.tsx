import { AppLayout } from "@/components/layout/app-layout";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function DashboardPage() {
    await requirePageAccess("dashboard");

    return (
        <AppLayout title="Dashboard">
            <div>
                <p>Dashboard content</p>
            </div>
        </AppLayout>
    );
}
