"use client";

import { useEffect, useState } from "react";
import OrderCard from "./order-card";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type Meal = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
};

type HubMeal = {
  _id: string;
  meal_id: Meal;
  meal_type: "breakfast" | "lunch" | "dinner";
  quantity: number;
  is_available: boolean;
};

type Hub = {
  _id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
};

type Order = {
  _id: string;
  user_id: { _id: string; name: string; email: string; phone?: string };
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
  delivery_person_id?: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  meal_items: Array<{ meal_id: { _id: string; name: string; price: number }; quantity: number }>;
  delivery_address?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  total_amount: number;
  status: "pending" | "packed" | "assigned" | "on_the_way" | "delivered" | "cancelled";
  meal_type: "breakfast" | "lunch" | "dinner";
  payment_status?: "pending" | "paid" | "failed";
  createdAt: string;
  estimated_delivery_time?: string;
  delivered_at?: string;
};

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

export default function HubPortalView() {
  const [hub, setHub] = useState<Hub | null>(null);
  const [selectedMealType, setSelectedMealType] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [menu, setMenu] = useState<HubMeal[]>([]);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState({
    hub: false,
    menu: false,
    meals: false,
    orders: false,
    updating: false,
  });
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"menu" | "orders" | "settings">("menu");
  const [showAddMealModal, setShowAddMealModal] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [allMeals, setAllMeals] = useState<Meal[]>([]);
  const [showMealFormModal, setShowMealFormModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [allMenus, setAllMenus] = useState<{
    breakfast: HubMeal[];
    lunch: HubMeal[];
    dinner: HubMeal[];
  }>({
    breakfast: [],
    lunch: [],
    dinner: [],
  });
  const [mealForm, setMealForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    meal_type: "lunch" as "breakfast" | "lunch" | "dinner",
  });
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string | null>(null);

  useEffect(() => {
    loadHub();
  }, []);

  useEffect(() => {
    if (hub) {
      loadMenu();
      loadOrders();
    }
  }, [hub, selectedMealType]);

  const loadHub = async () => {
    setLoading((prev) => ({ ...prev, hub: true }));
    try {
      const data = await authorizedFetch("/api/hub-portal/my-hub");
      setHub(data);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load hub" });
    } finally {
      setLoading((prev) => ({ ...prev, hub: false }));
    }
  };

  const loadMenu = async () => {
    setLoading((prev) => ({ ...prev, menu: true }));
    try {
      const data = await authorizedFetch(`/api/hub-portal/menu?meal_type=${selectedMealType}`);
      setMenu(data.menu || []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load menu" });
    } finally {
      setLoading((prev) => ({ ...prev, menu: false }));
    }
  };

  const loadAvailableMeals = async () => {
    setLoading((prev) => ({ ...prev, meals: true }));
    try {
      const data = await authorizedFetch("/api/hub-portal/available-meals");
      setAvailableMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load meals" });
    } finally {
      setLoading((prev) => ({ ...prev, meals: false }));
    }
  };

  const loadAllMeals = async () => {
    setLoading((prev) => ({ ...prev, meals: true }));
    try {
      const data = await authorizedFetch("/api/meals");
      setAllMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load meals" });
    } finally {
      setLoading((prev) => ({ ...prev, meals: false }));
    }
  };

  const loadAllMenus = async () => {
    if (!hub) return;
    try {
      const [breakfastData, lunchData, dinnerData] = await Promise.all([
        authorizedFetch(`/api/hub-portal/menu?meal_type=breakfast`).catch(() => ({ menu: [] })),
        authorizedFetch(`/api/hub-portal/menu?meal_type=lunch`).catch(() => ({ menu: [] })),
        authorizedFetch(`/api/hub-portal/menu?meal_type=dinner`).catch(() => ({ menu: [] })),
      ]);
      setAllMenus({
        breakfast: breakfastData.menu || [],
        lunch: lunchData.menu || [],
        dinner: dinnerData.menu || [],
      });
    } catch (error) {
      console.error("Failed to load all menus:", error);
    }
  };

  useEffect(() => {
    if (activeTab === "settings" && hub) {
      loadAllMeals();
      loadAllMenus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hub]);

  useEffect(() => {
    if (activeTab === "settings" && hub) {
      loadMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hub, selectedMealType]);

  const loadOrders = async () => {
    setLoading((prev) => ({ ...prev, orders: true }));
    try {
      const data = await authorizedFetch("/api/hub-portal/orders");
      setOrders(data.orders || []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load orders" });
    } finally {
      setLoading((prev) => ({ ...prev, orders: false }));
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingOrderStatus(orderId);
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
      setUpdatingOrderStatus(null);
    }
  };

  const getAvailableStatusActions = (order: any): ("pending" | "packed" | "assigned" | "on_the_way" | "delivered" | "cancelled")[] => {
    // Hub manager: pending → packed (driver assignment changes status to assigned automatically)
    if (order.status === "pending") return ["packed"];
    return [];
  };

  const getStatusColor = (status: string) => {
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
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleAddMeal = async () => {
    if (!selectedMeal || quantity <= 0) {
      setBanner({ type: "error", message: "Please select a meal and enter quantity" });
      return;
    }

    setLoading((prev) => ({ ...prev, updating: true }));
    setBanner(null);

    try {
      await authorizedFetch("/api/hub-portal/menu", {
        method: "POST",
        body: JSON.stringify({
          meal_id: selectedMeal._id,
          meal_type: selectedMealType,
          quantity,
          is_available: true,
        }),
      });
      setBanner({ type: "success", message: "Meal added to menu successfully" });
      setShowAddMealModal(false);
      setSelectedMeal(null);
      setQuantity(0);
      loadMenu();
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to add meal" });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  const handleUpdateQuantity = async (hubMealId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      setBanner({ type: "error", message: "Quantity cannot be negative" });
      return;
    }

    setLoading((prev) => ({ ...prev, updating: true }));
    setBanner(null);

    try {
      await authorizedFetch("/api/hub-portal/menu/quantity", {
        method: "PUT",
        body: JSON.stringify({
          hub_meal_id: hubMealId,
          quantity: newQuantity,
        }),
      });
      setBanner({ type: "success", message: "Quantity updated successfully" });
      loadMenu();
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to update quantity" });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  const handleDeleteFromMenu = async (hubMealId: string, mealName: string) => {
    if (!confirm(`Are you sure you want to remove "${mealName}" from the menu?`)) {
      return;
    }

    setLoading((prev) => ({ ...prev, updating: true }));
    setBanner(null);

    try {
      await authorizedFetch("/api/hub-portal/menu", {
        method: "DELETE",
        body: JSON.stringify({
          hub_meal_id: hubMealId,
        }),
      });
      setBanner({ type: "success", message: "Meal removed from menu successfully" });
      loadMenu();
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to remove meal from menu" });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  const openAddMealModal = () => {
    setShowAddMealModal(true);
    loadAvailableMeals();
  };

  const openMealFormModal = async (meal?: Meal) => {
    if (meal) {
      // Load all menus to check which types this meal is assigned to
      await loadAllMenus();
      
      setEditingMeal(meal);
      setMealForm({
        name: meal.name,
        description: meal.description || "",
        price: meal.price.toString(),
        image_url: meal.image_url || "",
        meal_type: selectedMealType, // Default to current selection, but user can change
      });
    } else {
      setEditingMeal(null);
      setMealForm({ 
        name: "", 
        description: "", 
        price: "", 
        image_url: "",
        meal_type: selectedMealType, // Pre-select based on current meal type selection
      });
    }
    setShowMealFormModal(true);
  };

  const handleCreateOrUpdateMeal = async () => {
    if (!mealForm.name || !mealForm.price) {
      setBanner({ type: "error", message: "Name and price are required" });
      return;
    }

    setLoading((prev) => ({ ...prev, updating: true }));
    setBanner(null);

    try {
      let createdMeal;
      if (editingMeal) {
        await authorizedFetch(`/api/meals/${editingMeal._id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: mealForm.name,
            description: mealForm.description,
            price: parseFloat(mealForm.price),
            image_url: mealForm.image_url,
          }),
        });
        setBanner({ type: "success", message: "Meal updated successfully" });
      } else {
        const response = await authorizedFetch("/api/meals", {
          method: "POST",
          body: JSON.stringify({
            name: mealForm.name,
            description: mealForm.description,
            price: parseFloat(mealForm.price),
            image_url: mealForm.image_url,
          }),
        });
        createdMeal = response.meal;
        setBanner({ type: "success", message: "Meal created successfully" });
        
        // Automatically add the meal to the selected menu type
        if (createdMeal && createdMeal._id) {
          try {
            await authorizedFetch("/api/hub-portal/menu", {
              method: "POST",
              body: JSON.stringify({
                meal_id: createdMeal._id,
                meal_type: mealForm.meal_type,
                quantity: 0,
                is_available: true,
              }),
            });
            setBanner({ type: "success", message: `Meal created and added to ${mealForm.meal_type} menu successfully` });
          } catch (menuError) {
            // Meal was created but failed to add to menu - still show success for meal creation
            console.error("Failed to add meal to menu:", menuError);
          }
        }
      }
      
      // If editing, check if meal needs to be added to the selected menu type
      if (editingMeal) {
        // Check if meal is already in the selected menu type
        const menuForType = allMenus[mealForm.meal_type] || [];
        const isAlreadyAssigned = menuForType.some(
          (hubMeal: HubMeal) => (hubMeal.meal_id._id || hubMeal.meal_id) === editingMeal._id
        );
        
        if (!isAlreadyAssigned) {
          try {
            await authorizedFetch("/api/hub-portal/menu", {
              method: "POST",
              body: JSON.stringify({
                meal_id: editingMeal._id,
                meal_type: mealForm.meal_type,
                quantity: 0,
                is_available: true,
              }),
            });
            setBanner({ type: "success", message: `Meal updated and added to ${mealForm.meal_type} menu successfully` });
          } catch (menuError) {
            console.error("Failed to add meal to menu:", menuError);
          }
        }
      }
      setShowMealFormModal(false);
      setEditingMeal(null);
      setMealForm({ name: "", description: "", price: "", image_url: "", meal_type: selectedMealType });
      loadAllMeals();
      loadAvailableMeals();
      loadMenu();
      loadAllMenus();
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to save meal" });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  const handleDeleteMeal = async (mealId: string) => {
    if (!confirm("Are you sure you want to delete this meal? This action cannot be undone.")) {
      return;
    }

    setLoading((prev) => ({ ...prev, updating: true }));
    setBanner(null);

    try {
      await authorizedFetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });
      setBanner({ type: "success", message: "Meal deleted successfully" });
      loadAllMeals();
      loadAvailableMeals();
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to delete meal" });
    } finally {
      setLoading((prev) => ({ ...prev, updating: false }));
    }
  };

  if (loading.hub) {
    return <div className="py-12 text-center text-slate-400">Loading hub...</div>;
  }

  if (!hub) {
    return (
      <div className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6 text-center">
        <p className="text-rose-100">You are not assigned as a hub manager</p>
      </div>
    );
  }

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Hub Management</p>
          <h2 className="text-2xl font-semibold text-white">{hub.name}</h2>
          <p className="text-xs text-slate-400">
            {hub.address.street}, {hub.address.city}, {hub.address.state} - {hub.address.pincode}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMealType("breakfast")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              selectedMealType === "breakfast"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Breakfast
          </button>
          <button
            onClick={() => setSelectedMealType("lunch")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              selectedMealType === "lunch"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Lunch
          </button>
          <button
            onClick={() => setSelectedMealType("dinner")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              selectedMealType === "dinner"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Dinner
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-6 py-3 text-sm font-semibold transition ${
            activeTab === "menu"
              ? "border-b-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Menu Management
        </button>
        <button
          onClick={() => setActiveTab("orders")}
          className={`px-6 py-3 text-sm font-semibold transition ${
            activeTab === "orders"
              ? "border-b-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-3 text-sm font-semibold transition ${
            activeTab === "settings"
              ? "border-b-2 border-sky-500 text-sky-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === "menu" && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu
            </h3>
            <button
              onClick={openAddMealModal}
              className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
            >
              + Add Meal
            </button>
          </div>

          {loading.menu ? (
            <p className="text-slate-400">Loading menu...</p>
          ) : menu.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No meals in menu. Click "Add Meal" to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {menu.map((hubMeal) => (
                <div
                  key={hubMeal._id}
                  className={`rounded-2xl border p-4 ${
                    hubMeal.is_available && hubMeal.quantity > 0
                      ? "border-slate-800 bg-slate-950/40"
                      : "border-rose-500/40 bg-rose-500/10"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{hubMeal.meal_id.name}</h4>
                      <p className="text-sm text-slate-400">₹{hubMeal.meal_id.price}</p>
                    </div>
                    {hubMeal.is_available && hubMeal.quantity > 0 ? (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">Available</span>
                    ) : (
                      <span className="rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-300">Out of Stock</span>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateQuantity(hubMeal._id, hubMeal.quantity - 1)}
                        className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-white transition hover:bg-slate-700"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={hubMeal.quantity}
                        onChange={(e) => handleUpdateQuantity(hubMeal._id, parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-1 text-center text-sm text-white outline-none focus:border-sky-400"
                        min="0"
                      />
                      <button
                        onClick={() => handleUpdateQuantity(hubMeal._id, hubMeal.quantity + 1)}
                        className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-white transition hover:bg-slate-700"
                      >
                        +
                      </button>
                      <span className="ml-2 text-xs text-slate-400">Qty</span>
                    </div>
                    <button
                      onClick={() => handleDeleteFromMenu(hubMeal._id, hubMeal.meal_id.name)}
                      disabled={loading.updating}
                      className="w-full rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Remove from Menu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "orders" && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-xl font-semibold text-white">Orders</h3>
          {loading.orders ? (
            <p className="text-slate-400">Loading orders...</p>
          ) : orders.length === 0 ? (
            <p className="text-slate-400">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <OrderCard
                  key={order._id}
                  order={order}
                  userRole="hub_manager"
                  onStatusUpdate={handleStatusUpdate}
                  updatingStatus={updatingOrderStatus}
                  getAvailableStatusActions={getAvailableStatusActions}
                  getStatusColor={getStatusColor}
                  formatDate={formatDate}
                  onDriverAssigned={loadOrders}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "settings" && (() => {
        // Check which meals are assigned to the current meal type menu
        const menuMealIds = new Set(menu.map((hubMeal) => hubMeal.meal_id._id || hubMeal.meal_id));
        const getMealAssignmentStatus = (mealId: string) => {
          return menuMealIds.has(mealId);
        };

        const handleAssignToMenu = async (meal: Meal) => {
          setLoading((prev) => ({ ...prev, updating: true }));
          setBanner(null);

          try {
            await authorizedFetch("/api/hub-portal/menu", {
              method: "POST",
              body: JSON.stringify({
                meal_id: meal._id,
                meal_type: selectedMealType,
                quantity: 0,
                is_available: true,
              }),
            });
            setBanner({ type: "success", message: `Meal added to ${selectedMealType} menu successfully` });
            loadMenu();
          } catch (error) {
            setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to add meal to menu" });
          } finally {
            setLoading((prev) => ({ ...prev, updating: false }));
          }
        };

        return (
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">Meal Management</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Manage meals for {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} menu
                </p>
              </div>
              <button
                onClick={() => openMealFormModal()}
                className="rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
              >
                + Create Meal
              </button>
            </div>

            {loading.meals || loading.menu ? (
              <p className="text-slate-400">Loading meals...</p>
            ) : allMeals.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400">No meals created yet. Click "Create Meal" to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {allMeals
                  .filter((meal) => {
                    // Check if meal is assigned to current meal type
                    const isAssignedToCurrent = getMealAssignmentStatus(meal._id);
                    
                    // If assigned to current type, always show it
                    if (isAssignedToCurrent) {
                      return true;
                    }
                    
                    // If not assigned to current type, check if it's assigned to other types
                    let assignedToOtherTypes = false;
                    (["breakfast", "lunch", "dinner"] as const).forEach((type) => {
                      if (type !== selectedMealType) {
                        const menuForType = allMenus[type] || [];
                        const isAssigned = menuForType.some(
                          (hubMeal: HubMeal) => (hubMeal.meal_id._id || hubMeal.meal_id) === meal._id
                        );
                        if (isAssigned) {
                          assignedToOtherTypes = true;
                        }
                      }
                    });
                    
                    // Show meal if:
                    // - It's assigned to current type, OR
                    // - It's not assigned to any other type (so it can be added to current type)
                    // Hide meal if it's only assigned to other types but not current type
                    return !assignedToOtherTypes;
                  })
                  .map((meal) => {
                  const isAssigned = getMealAssignmentStatus(meal._id);
                  return (
                    <div
                      key={meal._id}
                      className={`rounded-2xl border p-4 ${
                        isAssigned
                          ? "border-slate-800 bg-slate-950/40"
                          : "border-amber-500/40 bg-amber-500/10"
                      }`}
                    >
                      {meal.image_url && (
                        <img
                          src={meal.image_url}
                          alt={meal.name}
                          className="mb-3 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      <div className="mb-3">
                        <div className="flex items-start justify-between">
                          <h4 className="font-semibold text-white">{meal.name}</h4>
                          {isAssigned ? (
                            <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
                              Assigned
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs text-amber-300">
                              Not Assigned
                            </span>
                          )}
                        </div>
                        {meal.description && (
                          <p className="mt-1 text-sm text-slate-400 line-clamp-2">{meal.description}</p>
                        )}
                        <p className="mt-2 text-sm font-semibold text-sky-400">₹{meal.price}</p>
                      </div>
                      <div className="space-y-2">
                        {!isAssigned && (
                          <button
                            onClick={() => handleAssignToMenu(meal)}
                            disabled={loading.updating}
                            className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
                          >
                            Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} Menu
                          </button>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => openMealFormModal(meal)}
                            className="flex-1 rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteMeal(meal._id)}
                            disabled={loading.updating}
                            className="flex-1 rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Add Meal Modal */}
      {showAddMealModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowAddMealModal(false)}>
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Add Meal to Menu</h3>
              <button
                onClick={() => setShowAddMealModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Select Meal</label>
                <select
                  value={selectedMeal?._id || ""}
                  onChange={(e) => {
                    const meal = availableMeals.find((m) => m._id === e.target.value);
                    setSelectedMeal(meal || null);
                  }}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                >
                  <option value="">Choose a meal...</option>
                  {availableMeals.map((meal) => (
                    <option key={meal._id} value={meal._id}>
                      {meal.name} - ₹{meal.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Initial Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowAddMealModal(false)}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMeal}
                  disabled={loading.updating}
                  className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading.updating ? "Adding..." : "Add Meal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Meal Modal */}
      {showMealFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowMealFormModal(false)}>
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingMeal ? "Edit Meal" : "Create New Meal"}
              </h3>
              <button
                onClick={() => setShowMealFormModal(false)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Meal Name *</label>
                <input
                  type="text"
                  value={mealForm.name}
                  onChange={(e) => setMealForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Chicken Biryani"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Description</label>
                <textarea
                  value={mealForm.description}
                  onChange={(e) => setMealForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the meal..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400 resize-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Price (₹) *</label>
                <input
                  type="number"
                  value={mealForm.price}
                  onChange={(e) => setMealForm((prev) => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">
                  {editingMeal ? "Menu Type Assignment" : "Add to Menu Type *"}
                </label>
                <select
                  value={mealForm.meal_type}
                  onChange={(e) => setMealForm((prev) => ({ ...prev, meal_type: e.target.value as "breakfast" | "lunch" | "dinner" }))}
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
                {editingMeal ? (
                  <p className="mt-1 text-xs text-slate-400">
                    Select menu type to add this meal to (if not already assigned)
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Meal will be automatically added to the selected menu type
                  </p>
                )}
                {editingMeal && (() => {
                  // Check which menu types this meal is currently assigned to
                  const assignedTypes: string[] = [];
                  (["breakfast", "lunch", "dinner"] as const).forEach((type) => {
                    const menuForType = allMenus[type] || [];
                    const isAssigned = menuForType.some(
                      (hubMeal: HubMeal) => (hubMeal.meal_id._id || hubMeal.meal_id) === editingMeal._id
                    );
                    if (isAssigned) {
                      assignedTypes.push(type);
                    }
                  });
                  
                  if (assignedTypes.length > 0) {
                    return (
                      <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                        <p className="text-xs text-slate-400 mb-1">Currently assigned to:</p>
                        <div className="flex gap-2 flex-wrap">
                          {assignedTypes.map((type) => (
                            <span
                              key={type}
                              className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300 capitalize"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div>
                <label className="mb-1 block text-sm text-slate-300">Image URL</label>
                <input
                  type="url"
                  value={mealForm.image_url}
                  onChange={(e) => setMealForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  placeholder="https://example.com/image.jpg"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                />
              </div>

              {mealForm.image_url && (
                <div className="rounded-xl overflow-hidden">
                  <img
                    src={mealForm.image_url}
                    alt="Preview"
                    className="h-32 w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowMealFormModal(false);
                    setEditingMeal(null);
                    setMealForm({ name: "", description: "", price: "", image_url: "", meal_type: selectedMealType });
                  }}
                  className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdateMeal}
                  disabled={loading.updating || !mealForm.name || !mealForm.price}
                  className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading.updating ? (editingMeal ? "Updating..." : "Creating...") : editingMeal ? "Update Meal" : "Create Meal"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

