import { AppLayout } from "@/components/layout/app-layout";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function PaymentsEditPage() {
    await requirePageAccess("payments");

    return (
        <AppLayout title="Edit Payment">
            <div>
                <p>Edit Payment Page Content</p>
            </div>
        </AppLayout>
    );
}
