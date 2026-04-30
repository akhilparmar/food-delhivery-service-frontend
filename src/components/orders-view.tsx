"use client";

import { useEffect, useState } from "react";
import OrderCard from "./order-card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type Order = {
  _id: string;
  meal_items: Array<{
    meal_id: {
      _id: string;
      name: string;
      price: number;
    };
    quantity: number;
  }>;
  hub_id?: {
    _id: string;
    name: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  user_id?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  delivery_person_id?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  delivery_address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  meal_type: "breakfast" | "lunch" | "dinner";
  status: "pending" | "packed" | "assigned" | "on_the_way" | "delivered" | "cancelled";
  payment_status?: "pending" | "paid" | "failed";
  total_amount: number;
  createdAt: string;
  estimated_delivery_time?: string;
  delivered_at?: string;
};

function getUserRole(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const authUser = localStorage.getItem("authUser");
    if (authUser) {
      const user = JSON.parse(authUser);
      return user.role || null;
    }
  } catch (error) {
    console.error("Error parsing user role:", error);
  }
  return null;
}

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

async function authorizedFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed");
  }
  return response.json().catch(() => ({}));
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    case "packed":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "on_the_way":
      return "bg-purple-500/20 text-purple-300 border-purple-500/40";
    case "delivered":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40";
    case "cancelled":
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/40";
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const role = getUserRole();
      // Hub managers see hub orders, customers see their own orders
      const endpoint = role === "hub_manager" || role === "admin" ? "/api/orders/hub-orders" : "/api/orders/my-orders";
      const data = await authorizedFetch(endpoint);
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load orders" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingStatus(orderId);
    try {
      await authorizedFetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      setBanner({ type: "success", message: "Order status updated successfully" });
      await loadOrders(); // Reload orders
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to update status" });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getAvailableStatusActions = (order: Order): Order["status"][] => {
    const role = getUserRole();
    if (role === "hub_manager" || role === "admin") {
      // Hub manager: pending → packed (driver assignment changes status to assigned automatically)
      if (order.status === "pending") return ["packed"];
      return [];
    } else if (role === "driver") {
      // Driver can: assigned → on_the_way → delivered
      if (order.status === "assigned" && order.delivery_person_id) {
        return ["on_the_way"];
      }
      if (order.status === "on_the_way") {
        return ["delivered"];
      }
      return [];
    }
    return [];
  };

  const filteredOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter);

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Order History</p>
          <h2 className="text-2xl font-semibold text-white">
            {userRole === "hub_manager" || userRole === "admin" ? "Hub Orders" : "My Orders"}
          </h2>
          <p className="text-xs text-slate-400">
            {userRole === "hub_manager" || userRole === "admin"
              ? "Manage orders for your hub"
              : "View all your placed orders"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "all"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "pending"
                ? "bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("packed")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "packed"
                ? "bg-blue-500 text-slate-950 shadow-lg shadow-blue-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Packed
          </button>
          <button
            onClick={() => setFilter("assigned")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "assigned"
                ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Assigned
          </button>
          <button
            onClick={() => setFilter("on_the_way")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "on_the_way"
                ? "bg-purple-500 text-slate-950 shadow-lg shadow-purple-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            On The Way
          </button>
          <button
            onClick={() => setFilter("delivered")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "delivered"
                ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Delivered
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              filter === "cancelled"
                ? "bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Cancelled
          </button>
        </div>
      </header>

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
              : "border-rose-500/40 bg-rose-500/10 text-rose-100"
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        {loading ? (
          <div className="py-12 text-center">
            <p className="text-slate-400">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400">
              {filter === "all" ? "No orders found. Start by placing an order!" : `No ${filter} orders found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                userRole={userRole}
                onStatusUpdate={handleStatusUpdate}
                updatingStatus={updatingStatus}
                getAvailableStatusActions={getAvailableStatusActions}
                getStatusColor={getStatusColor}
                formatDate={formatDate}
                onDriverAssigned={loadOrders}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

