import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import MenuView from "@/components/menu-view";

export default async function MenuPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("authToken");

  if (!authCookie?.value) {
    redirect("/login");
  }

  return (
    <DashboardShell initialAuth={Boolean(authCookie?.value)}>
      <MenuView />
    </DashboardShell>
  );
}

