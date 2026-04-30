import { cookies } from "next/headers";
import DashboardShell from "@/components/dashboard-shell";
import HubsView from "@/components/hubs-view";

export const metadata = {
    title: "Hub Management | Tiffin Service",
    description: "Manage test-app distribution hubs",
};

export default async function HubsPage() {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get("authToken");

    return (
        <DashboardShell initialAuth={Boolean(authCookie?.value)}>
            <HubsView />
        </DashboardShell>
    );
}

