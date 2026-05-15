import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth-guard";

export default async function HomePage() {
    await requireAuth();
    redirect("/dashboard");
}
