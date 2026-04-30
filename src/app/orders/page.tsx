import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import OrdersView from "@/components/orders-view";

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("authToken");

  if (!authCookie?.value) {
    redirect("/login");
  }

  return (
    <DashboardShell initialAuth={Boolean(authCookie?.value)}>
      <OrdersView />
    </DashboardShell>
  );
}

