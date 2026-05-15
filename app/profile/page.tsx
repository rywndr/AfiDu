import { AppLayout } from "@/components/layout/app-layout";
import { requirePageAccess } from "@/lib/auth-guard";

export default async function ProfilePage() {
    await requirePageAccess("profile");

    return (
        <AppLayout title="Profile">
            <div>
                <h2>Profile</h2>
                <p>User profile information goes here</p>
            </div>
        </AppLayout>
    );
}
