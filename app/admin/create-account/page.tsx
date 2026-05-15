import { AppLayout } from "@/components/layout/app-layout";
import { CreateAccountForm } from "@/components/admin/create-account-form";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/auth-guard";

export default async function CreateAccountPage() {
    await requirePermission("settings", "create");

    return (
        <AppLayout title="Create Account">
            <div className="space-y-6">
                <PageHeader
                    title="Buat Akun Baru"
                    description="Buat akun pengguna baru dan tetapkan peran untuk mengakses sistem."
                />
                <div className="max-w-lg">
                    <CreateAccountForm />
                </div>
            </div>
        </AppLayout>
    );
}
