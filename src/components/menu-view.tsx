"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type Meal = {
  _id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available_quantity?: number;
  is_available?: boolean;
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

type CartItem = {
  meal_id: string;
  meal_name: string;
  quantity: number;
  price: number;
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

// Helper function to load cart from localStorage
function loadCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      return JSON.parse(savedCart);
    }
  } catch (e) {
    console.error("Error loading cart:", e);
  }
  return [];
}

export default function MenuView() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [cart, setCart] = useState<CartItem[]>(loadCartFromStorage);
  const [loading, setLoading] = useState({ meals: false, hubs: false });
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner">("lunch");

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart]);

  useEffect(() => {
    loadHubs();
  }, []);

  useEffect(() => {
    if (selectedHub) {
      loadMeals();
    } else {
      setMeals([]);
    }
  }, [selectedHub, mealType]);

  const loadHubs = async () => {
    setLoading((prev) => ({ ...prev, hubs: true }));
    try {
      const data = await authorizedFetch("/api/hubs");
      setHubs(Array.isArray(data) ? data : []);
      if (data.length > 0) {
        setSelectedHub(data[0]); // Auto-select first hub
      }
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load hubs" });
    } finally {
      setLoading((prev) => ({ ...prev, hubs: false }));
    }
  };

  const loadMeals = async () => {
    if (!selectedHub) return;
    
    setLoading((prev) => ({ ...prev, meals: true }));
    try {
      const data = await authorizedFetch(`/api/meals?hubId=${selectedHub._id}&meal_type=${mealType}`);
      setMeals(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load meals" });
    } finally {
      setLoading((prev) => ({ ...prev, meals: false }));
    }
  };

  const addToCart = (meal: Meal) => {
    if (meal.available_quantity === 0 || meal.is_available === false) {
      setBanner({ type: "error", message: "This meal is currently out of stock" });
      return;
    }

    const existingItem = cart.find((item) => item.meal_id === meal._id);
    if (existingItem) {
      setCart(cart.map((item) => (item.meal_id === meal._id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { meal_id: meal._id, meal_name: meal.name, quantity: 1, price: meal.price }]);
    }
    setBanner({ type: "success", message: `${meal.name} added to cart` });
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Menu & Availability</p>
          <h2 className="text-2xl font-semibold text-white">View Menu</h2>
          <p className="text-xs text-slate-400">Browse available meals and their details</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cartItemCount > 0 && (
            <button
              onClick={() => router.push("/book")}
              className="relative rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
            >
              <span className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                View Cart ({cartItemCount})
              </span>
            </button>
          )}
          <button
            onClick={() => setMealType("breakfast")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              mealType === "breakfast"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Breakfast
          </button>
          <button
            onClick={() => setMealType("lunch")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              mealType === "lunch"
                ? "bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/30"
                : "border border-slate-700 bg-slate-900/50 text-slate-300"
            }`}
          >
            Lunch
          </button>
          <button
            onClick={() => setMealType("dinner")}
            className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
              mealType === "dinner"
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

      {/* Hub Selection */}
      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        <h3 className="mb-4 text-xl font-semibold text-white">Select Hub</h3>
        {loading.hubs ? (
          <p className="text-slate-400">Loading hubs...</p>
        ) : hubs.length === 0 ? (
          <p className="text-slate-400">No hubs available</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {hubs.map((hub) => (
              <button
                key={hub._id}
                onClick={() => setSelectedHub(hub)}
                className={`rounded-2xl border p-4 text-left transition ${
                  selectedHub?._id === hub._id
                    ? "border-sky-500 bg-sky-500/10"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                }`}
              >
                <h4 className="font-semibold text-white">{hub.name}</h4>
                <p className="mt-1 text-sm text-slate-400">
                  {hub.address.street}, {hub.address.city}, {hub.address.state} - {hub.address.pincode}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Menu Display */}
      {selectedHub && (
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Menu - {selectedHub.name}
              </h3>
              <p className="mt-1 text-sm text-slate-400">View meal details and availability</p>
            </div>
          </div>

          {loading.meals ? (
            <p className="text-slate-400">Loading meals...</p>
          ) : meals.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400">No meals available for {mealType} at this hub</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {meals.map((meal) => (
                <div
                  key={meal._id}
                  className={`rounded-2xl border p-4 ${
                    meal.is_available && (meal.available_quantity ?? 0) > 0
                      ? "border-slate-800 bg-slate-950/40"
                      : "border-rose-500/40 bg-rose-500/10 opacity-75"
                  }`}
                >
                  {meal.image_url && (
                    <img
                      src={meal.image_url}
                      alt={meal.name}
                      className="mb-4 h-48 w-full rounded-xl object-cover"
                    />
                  )}
                  <div className="mb-3">
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="text-lg font-semibold text-white">{meal.name}</h4>
                      {meal.is_available && (meal.available_quantity ?? 0) > 0 ? (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs text-emerald-300">
                          Available
                        </span>
                      ) : (
                        <span className="rounded-full bg-rose-500/20 px-2 py-1 text-xs text-rose-300">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    {meal.description && (
                      <p className="mb-3 text-sm leading-relaxed text-slate-300">{meal.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-sky-400">₹{meal.price}</p>
                        {meal.available_quantity !== undefined && (
                          <p className="mt-1 text-xs text-slate-400">
                            {meal.available_quantity > 0 ? (
                              <span className="text-emerald-400">{meal.available_quantity} units available</span>
                            ) : (
                              <span className="text-rose-400">Currently unavailable</span>
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(meal)}
                        disabled={meal.available_quantity === 0 || meal.is_available === false}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

