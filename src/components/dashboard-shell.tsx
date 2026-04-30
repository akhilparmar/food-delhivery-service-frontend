"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";

const heroImage =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1600&q=80&sat=-15";

function checkAuthStatus() {
  if (typeof window === "undefined") return false;
  const tokenFromStorage = localStorage.getItem("authToken");
  const tokenFromCookie =
    typeof document !== "undefined"
      ? document.cookie
        .split(";")
        .map((c) => c.trim())
        .find((c) => c.startsWith("authToken="))
      : null;
  return Boolean(tokenFromStorage || tokenFromCookie);
}

type DashboardShellProps = {
  initialAuth: boolean;
  children?: ReactNode;
};

// Menu items with their required permissions
const navItems = [
  { label: "Overview", href: "/", permission: "view_dashboard" },
  { label: "Book Tiffin", href: "/book", permission: "create_order" }, // Customers can book
  { label: "Menu", href: "/menu", permission: "view_meals" }, // Customers can view menu
  { label: "Hub Portal", href: "/hub-portal", permission: "manage_hub_operations" }, // Hub managers
  { label: "Orders", href: "/orders", permission: "view_orders" },
  { label: "Hubs", href: "/hubs", permission: "view_hubs" },

  { label: "Drivers", href: "#", permission: "view_drivers" },
  { label: "Customers", href: "#", permission: "view_customers" },
  { label: "Insights", href: "#", permission: "view_analytics" },
  { label: "Roles & Permissions", href: "/roles", permission: "view_roles" },
  { label: "Settings", href: "#", permission: "view_settings" },
];

// Get user permissions from localStorage
function getUserPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const authUser = localStorage.getItem("authUser");
    if (authUser) {
      const user = JSON.parse(authUser);
      return user.permissions || [];
    }
  } catch (error) {
    console.error("Error parsing user permissions:", error);
  }
  return [];
}

export default function DashboardShell({ initialAuth, children }: DashboardShellProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuth);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const pathname = usePathname();

  const refreshAuthState = useCallback(() => {
    setIsAuthenticated(checkAuthStatus());
    setUserPermissions(getUserPermissions());
  }, []);

  useEffect(() => {
    const handler = () => refreshAuthState();
    handler();
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshAuthState]);

  // Filter menu items based on user permissions
  const filteredNavItems = navItems.filter((item) => {
    // If no permission required, show it (for items without permission field)
    if (!item.permission) return true;
    // Check if user has the required permission
    return userPermissions.includes(item.permission);
  });

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    document.cookie = "authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.dispatchEvent(new StorageEvent("storage", { key: "authToken" }));
  };

  if (!isAuthenticated) {
    return (
      <div
        className="relative min-h-screen bg-slate-950 text-slate-100"
        style={{
          backgroundImage: `linear-gradient(rgba(2,6,23,0.5), rgba(2,6,23,0.5)), url(${heroImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/85" aria-hidden />
        <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-4 py-16 text-center">
          <p className="text-sm uppercase tracking-[0.6rem] text-slate-400">Solstice Kitchens</p>
          <h1 className="mt-6 text-4xl font-semibold text-white sm:text-5xl">
            Log in to orchestrate every hub, driver, and delivery
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Access to the live dashboard requires authentication. Sign in to unlock routing insights, Ops schedules, and
            real-time fulfillment telemetry.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/login"
              className="min-w-[160px] rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-sky-400 hover:text-sky-100"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="min-w-[160px] rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
            >
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen bg-slate-950 text-slate-100"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.5), rgba(2,6,23,0.5)), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/55 to-slate-950/85" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-8 lg:flex-row lg:px-8">
        <aside className="w-full rounded-3xl border border-slate-900 bg-gradient-to-b from-slate-900 to-slate-950/80 p-6 lg:w-64">
          <div className="mb-10">
            <p className="text-sm uppercase tracking-[0.3rem] text-slate-500">SOLSTICE KITCHENS</p>
            <h1 className="mt-4 text-2xl font-semibold text-white">Operations Hub</h1>
          </div>
          <nav className="space-y-3 font-medium text-sm text-slate-400">
            {filteredNavItems.map((item) => {
              const isActive = item.href !== "#" && pathname === item.href;
              const baseClasses = `flex items-center justify-between rounded-2xl px-4 py-3 transition ${isActive ? "bg-white/10 text-white shadow-lg shadow-black/40" : "hover:bg-white/5 hover:text-white"
                }`;

              return item.href === "#" ? (
                <span key={item.label} className={baseClasses}>
                  {item.label}
                  <span className="text-xs text-slate-500">〉</span>
                </span>
              ) : (
                <Link key={item.label} href={item.href} className={baseClasses}>
                  {item.label}
                  <span className="text-xs text-slate-500">〉</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-500">System status</p>
            <p className="mt-2 text-lg font-semibold text-white">All services online</p>
            <p className="text-xs text-slate-400">No incidents reported in the last 24 hours.</p>
            <button
              onClick={handleLogout}
              className="mt-4 w-full rounded-2xl border border-red-500/60 px-4 py-2 text-sm font-medium text-red-100 transition hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </aside>

        <main className="flex-1 space-y-8 pb-10">{children}</main>
      </div>
    </div>
  );
}

