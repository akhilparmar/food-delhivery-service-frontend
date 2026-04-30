import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import BookingView from "@/components/booking-view";

export default async function BookPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("authToken");

  if (!authCookie?.value) {
    redirect("/login");
  }

  return (
    <DashboardShell initialAuth={Boolean(authCookie?.value)}>
      <BookingView />
    </DashboardShell>
  );
}

