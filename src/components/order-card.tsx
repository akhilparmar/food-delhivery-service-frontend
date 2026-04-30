"use client";

import { useState } from "react";

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

type Driver = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
};

type OrderCardProps = {
  order: Order;
  userRole?: string | null;
  onStatusUpdate?: (orderId: string, newStatus: Order["status"]) => void;
  updatingStatus?: string | null;
  getAvailableStatusActions?: (order: Order) => Order["status"][];
  getStatusColor?: (status: string) => string;
  formatDate?: (dateString: string) => string;
  onDriverAssigned?: () => void;
  API_BASE_URL?: string;
  getAuthToken?: () => string | null;
};

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
    case "packed":
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    case "assigned":
      return "bg-cyan-500/20 text-cyan-300 border-cyan-500/40";
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

const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

function defaultGetAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("authToken");
}

async function authorizedFetch(
  path: string,
  options: RequestInit = {},
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
  getToken: () => string | null = defaultGetAuthToken
) {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Request failed");
  }
  return response.json().catch(() => ({}));
}

export default function OrderCard({
  order,
  userRole,
  onStatusUpdate,
  updatingStatus,
  getAvailableStatusActions,
  getStatusColor: customGetStatusColor,
  formatDate: customFormatDate,
  onDriverAssigned,
  API_BASE_URL = DEFAULT_API_BASE_URL,
  getAuthToken = defaultGetAuthToken,
}: OrderCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [assigningDriver, setAssigningDriver] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const statusColorFn = customGetStatusColor || getStatusColor;
  const formatDateFn = customFormatDate || formatDate;

  // Helper function to get the effective status (if driver is assigned, status should be "assigned" or later)
  const getEffectiveStatus = (): Order["status"] => {
    if (order.delivery_person_id && (order.status === "packed" || order.status === "assigned")) {
      return "assigned";
    }
    return order.status;
  };

  const effectiveStatus = getEffectiveStatus();

  // Create a temporary order object with effective status for status action checks
  const orderWithEffectiveStatus = { ...order, status: effectiveStatus };
  const availableActions = getAvailableStatusActions ? getAvailableStatusActions(orderWithEffectiveStatus) : [];

  const loadDrivers = async () => {
    setLoadingDrivers(true);
    try {
      const data = await authorizedFetch(`/api/orders/drivers`, {}, API_BASE_URL, getAuthToken);
      setDrivers(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load drivers" });
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAssignDriver = async (driverId: string) => {
    setAssigningDriver(driverId);
    try {
      await authorizedFetch(
        `/api/orders/${order._id}/assign-driver`,
        {
          method: "POST",
          body: JSON.stringify({ driverId }),
        },
        API_BASE_URL,
        getAuthToken
      );
      setBanner({ type: "success", message: "Driver assigned successfully" });
      setShowDriverModal(false);
      if (onDriverAssigned) {
        onDriverAssigned();
      }
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to assign driver" });
    } finally {
      setAssigningDriver(null);
    }
  };

  const handleShowDriverModal = () => {
    setBanner(null); // Clear any previous banners
    setShowDriverModal(true);
    loadDrivers();
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700">
      {/* Compact View - Always Visible */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColorFn(effectiveStatus)}`}>
              {effectiveStatus === "on_the_way"
                ? "On The Way"
                : effectiveStatus === "assigned"
                ? "Assigned"
                : effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
            </span>
            <span className="rounded-full border border-slate-700 bg-slate-900/50 px-2.5 py-1 text-xs text-slate-300 capitalize">
              {order.meal_type}
            </span>
            {order.payment_status === "paid" && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-xs text-emerald-300">
                Paid
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">
              {order.user_id ? order.user_id.name : `Order #${order._id.slice(-8).toUpperCase()}`}
            </p>
            <p className="text-xs text-slate-400">
              {order.meal_items.length} item{order.meal_items.length > 1 ? "s" : ""} • {formatDateFn(order.createdAt)}
            </p>
            {order.user_id && (userRole === "hub_manager" || userRole === "admin") && (
              <p className="text-xs text-slate-400">{order.user_id.email}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-xl font-bold text-sky-400">₹{order.total_amount.toFixed(2)}</p>
          <div className="flex flex-col gap-2">
            {effectiveStatus === "packed" && !order.delivery_person_id && (userRole === "hub_manager" || userRole === "admin") && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleShowDriverModal();
                }}
                className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Assign Driver
              </button>
            )}
            {order.delivery_person_id && (
              <>
                <p className="text-xs text-slate-400">Driver: {order.delivery_person_id.name}</p>
                {effectiveStatus === "assigned" && (
                  <p className="text-xs text-cyan-400">Ready for pickup</p>
                )}
              </>
            )}
            {availableActions.length > 0 && onStatusUpdate && (
              <button
                onClick={() => onStatusUpdate(order._id, availableActions[0])}
                disabled={updatingStatus === order._id}
                className="rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingStatus === order._id
                  ? "Updating..."
                  : `Mark as ${availableActions[0].charAt(0).toUpperCase() + availableActions[0].slice(1).replace("_", " ")}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="mt-3 border-t border-slate-800 pt-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex w-full items-center justify-between text-sm text-slate-400 transition hover:text-slate-300"
        >
          <span>{showDetails ? "Hide" : "Show"} Details</span>
          <svg
            className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs text-slate-500">Order ID</p>
              <p className="text-sm text-slate-300">{order._id.slice(-8).toUpperCase()}</p>
            </div>

            {order.hub_id && (
              <div>
                <p className="text-xs text-slate-500">Hub</p>
                <p className="text-sm text-slate-300">{order.hub_id.name}</p>
              </div>
            )}

            {order.user_id && (userRole === "hub_manager" || userRole === "admin") && (
              <div>
                <p className="text-xs text-slate-500">Customer</p>
                <p className="text-sm text-slate-300">{order.user_id.name}</p>
                <p className="text-xs text-slate-400">{order.user_id.email}</p>
                {order.user_id.phone && <p className="text-xs text-slate-400">{order.user_id.phone}</p>}
              </div>
            )}

            <div>
              <p className="mb-2 text-xs font-semibold text-slate-400">Order Items</p>
              <div className="space-y-1.5">
                {order.meal_items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-900/50 px-2.5 py-1.5">
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-white">{item.meal_id.name}</p>
                      <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-xs font-semibold text-slate-300">
                      ₹{(item.meal_id.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {order.delivery_address && (
              <div>
                <p className="mb-1 text-xs font-semibold text-slate-400">Delivery Address</p>
                <p className="text-xs text-slate-300">
                  {order.delivery_address.street}, {order.delivery_address.city}, {order.delivery_address.state} -{" "}
                  {order.delivery_address.pincode}
                </p>
              </div>
            )}

            {order.estimated_delivery_time && (
              <div>
                <p className="text-xs text-slate-500">Est. Delivery</p>
                <p className="text-sm text-slate-300">{formatDateFn(order.estimated_delivery_time)}</p>
              </div>
            )}

            {order.delivered_at && (
              <div>
                <p className="text-xs text-slate-500">Delivered At</p>
                <p className="text-sm text-emerald-300">{formatDateFn(order.delivered_at)}</p>
              </div>
            )}

            {/* Additional Status Actions (if multiple) */}
            {availableActions.length > 1 && onStatusUpdate && (
              <div className="border-t border-slate-800 pt-3">
                <p className="mb-2 text-xs font-semibold text-slate-400">Other Actions</p>
                <div className="flex flex-wrap gap-2">
                  {availableActions.slice(1).map((newStatus) => (
                    <button
                      key={newStatus}
                      onClick={() => onStatusUpdate(order._id, newStatus)}
                      disabled={updatingStatus === order._id}
                      className="rounded-lg bg-sky-500/80 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {updatingStatus === order._id
                        ? "Updating..."
                        : `Mark as ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace("_", " ")}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Driver Assignment Modal */}
      {showDriverModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4" 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDriverModal(false);
            }
          }}
        >
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl relative z-[10000]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">Assign Driver</h3>
              <button
                onClick={() => {
                  setShowDriverModal(false);
                  setBanner(null);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-slate-300 transition hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {banner && (
              <div
                className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                  banner.type === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-100"
                }`}
              >
                {banner.message}
              </div>
            )}

            {loadingDrivers ? (
              <div className="py-12 text-center">
                <p className="text-slate-400">Loading drivers...</p>
              </div>
            ) : drivers.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400">No drivers available</p>
                <p className="mt-2 text-xs text-slate-500">Please add drivers to the system</p>
              </div>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">Select a driver to assign to this order:</p>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {drivers.map((driver) => (
                    <div
                      key={driver._id}
                      className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-white">{driver.name}</p>
                        <p className="text-sm text-slate-400">{driver.email}</p>
                        {driver.phone && <p className="text-sm text-slate-400">{driver.phone}</p>}
                        {driver.address && (driver.address.city || driver.address.state) && (
                          <p className="mt-1 text-xs text-slate-500">
                            {driver.address.city && driver.address.state
                              ? `${driver.address.city}, ${driver.address.state}`
                              : driver.address.city || driver.address.state}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAssignDriver(driver._id)}
                        disabled={assigningDriver === driver._id}
                        className="ml-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assigningDriver === driver._id ? "Assigning..." : "Assign"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

