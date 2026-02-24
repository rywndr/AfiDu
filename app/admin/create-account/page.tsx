import { AppLayout } from "@/components/layout/app-layout";
import { CreateAccountForm } from "@/components/admin/create-account-form";

export default function CreateAccountPage() {
    return (
        <AppLayout title="Create Account">
            <div className="flex items-start justify-center pt-8">
                <CreateAccountForm />
            </div>
        </AppLayout>
    );
}
