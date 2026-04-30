import { cookies } from "next/headers";
import DashboardShell from "@/components/dashboard-shell";
import DashboardHome from "@/components/dashboard-home";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("authToken");
  return (
    <DashboardShell initialAuth={Boolean(authCookie?.value)}>
      <DashboardHome />
    </DashboardShell>
  );
}
