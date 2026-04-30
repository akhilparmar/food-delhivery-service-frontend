import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import RolesPermissionsView from "@/components/roles-permissions-view";
import DashboardShell from "@/components/dashboard-shell";

export default async function RolesPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("authToken");

  if (!authCookie?.value) {
    redirect("/login");
  }

  return (
    <DashboardShell initialAuth={Boolean(authCookie?.value)}>
      <RolesPermissionsView />
    </DashboardShell>
  );
}

