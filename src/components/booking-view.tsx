"use client";

import { useEffect, useState } from "react";

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

// Helper function to load saved addresses from localStorage
function loadSavedAddresses(): Array<{
  id: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: { lat: number; lng: number };
}> {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("savedAddresses");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error loading saved addresses:", e);
  }
  return [];
}

// Helper function to save addresses to localStorage
function saveAddressesToStorage(addresses: Array<{
  id: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  coordinates?: { lat: number; lng: number };
}>) {
  if (typeof window !== "undefined") {
    localStorage.setItem("savedAddresses", JSON.stringify(addresses));
  }
}

export default function BookingView() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [cart, setCart] = useState<CartItem[]>(loadCartFromStorage);
  const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState({ meals: false, hub: false, hubs: false, submitting: false });
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner">("lunch");
  const [hubSelectionMethod, setHubSelectionMethod] = useState<"manual" | "address">("manual");

  // Address form
  const [address, setAddress] = useState({
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    coordinates?: { lat: number; lng: number };
  }>>(loadSavedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);

  // Auto-select first address if available
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(savedAddresses[0].id);
      const firstAddress = savedAddresses[0];
      setAddress({
        street: firstAddress.street,
        city: firstAddress.city,
        state: firstAddress.state,
        pincode: firstAddress.pincode,
      });
      if (firstAddress.coordinates) {
        setCoordinates(firstAddress.coordinates);
      }
    }
  }, [savedAddresses, selectedAddressId]);

  useEffect(() => {
    loadHubs();
  }, []);

  useEffect(() => {
    if (selectedHub) {
      loadMeals();
    }
  }, [selectedHub, mealType]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart]);

  const loadHubs = async () => {
    setLoading((prev) => ({ ...prev, hubs: true }));
    try {
      const data = await authorizedFetch("/api/hubs");
      setHubs(Array.isArray(data) ? data : []);
      // Auto-select first hub
      if (data.length > 0 && !selectedHub) {
        setSelectedHub(data[0]);
      }
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load hubs" });
    } finally {
      setLoading((prev) => ({ ...prev, hubs: false }));
    }
  };

  const loadMeals = async () => {
    if (!selectedHub) {
      setMeals([]);
      return;
    }
    
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

  const findNearestHub = async () => {
    if (!coordinates) {
      setBanner({ type: "error", message: "Please enter a valid address" });
      return;
    }

    setLoading((prev) => ({ ...prev, hub: true }));
    try {
      const hub = await fetch(
        `${API_BASE_URL}/api/hubs/nearest?latitude=${coordinates.lat}&longitude=${coordinates.lng}`
      ).then((res) => res.json());

      if (hub._id) {
        setSelectedHub(hub);
        setBanner({ type: "success", message: `Nearest hub selected: ${hub.name}` });
      } else {
        setBanner({ type: "error", message: hub.message || "No hub found near your address" });
      }
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to find hub" });
    } finally {
      setLoading((prev) => ({ ...prev, hub: false }));
    }
  };

  const getCoordinatesFromAddress = async (addr?: { street: string; city: string; state: string; pincode: string }) => {
    const addrToUse = addr || address;
    const fullAddress = `${addrToUse.street}, ${addrToUse.city}, ${addrToUse.state} ${addrToUse.pincode}`;
    
    // Using a free geocoding API (you might want to use Google Maps, Mapbox, etc.)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        if (!addr) {
          setCoordinates(coords);
        }
        return { success: true, coordinates: coords };
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
    
    return { success: false, coordinates: null };
  };

  const handleSaveAddress = async () => {
    if (!address.street || !address.city || !address.state || !address.pincode) {
      setBanner({ type: "error", message: "Please fill in all address fields" });
      return;
    }

    const geocodeResult = await getCoordinatesFromAddress();
    if (!geocodeResult.success || !geocodeResult.coordinates) {
      setBanner({ type: "error", message: "Could not geocode address. Please check your address." });
      return;
    }

    const newAddress = {
      id: Date.now().toString(),
      street: address.street,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      coordinates: geocodeResult.coordinates,
    };

    const updatedAddresses = [...savedAddresses, newAddress];
    setSavedAddresses(updatedAddresses);
    saveAddressesToStorage(updatedAddresses);
    setSelectedAddressId(newAddress.id);
    setCoordinates(geocodeResult.coordinates);
    setShowAddAddressForm(false);
    setShowAddressModal(false);
    setBanner({ type: "success", message: "Address saved successfully" });
  };

  const handleSelectAddress = (addressId: string) => {
    const selectedAddress = savedAddresses.find((addr) => addr.id === addressId);
    if (selectedAddress) {
      setSelectedAddressId(addressId);
      setAddress({
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      });
      if (selectedAddress.coordinates) {
        setCoordinates(selectedAddress.coordinates);
      }
      setShowAddressModal(false);
    }
  };

  const handleDeleteAddress = (addressId: string) => {
    const updatedAddresses = savedAddresses.filter((addr) => addr.id !== addressId);
    setSavedAddresses(updatedAddresses);
    saveAddressesToStorage(updatedAddresses);
    if (selectedAddressId === addressId) {
      if (updatedAddresses.length > 0) {
        handleSelectAddress(updatedAddresses[0].id);
      } else {
        setSelectedAddressId(null);
        setAddress({ street: "", city: "", state: "", pincode: "" });
        setCoordinates(null);
      }
    }
    setBanner({ type: "success", message: "Address deleted" });
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    if (!address.street || !address.city || !address.state || !address.pincode) {
      setBanner({ type: "error", message: "Please fill in all address fields" });
      return;
    }

    const geocodeResult = await getCoordinatesFromAddress();
    if (geocodeResult.success) {
      await findNearestHub();
    } else {
      setBanner({ type: "error", message: "Could not geocode address. Please check your address." });
    }
  };

  const addToCart = (meal: Meal) => {
    const existingItem = cart.find((item) => item.meal_id === meal._id);
    if (existingItem) {
      setCart(cart.map((item) => (item.meal_id === meal._id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { meal_id: meal._id, meal_name: meal.name, quantity: 1, price: meal.price }]);
    }
  };

  const updateCartQuantity = (mealId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter((item) => item.meal_id !== mealId));
    } else {
      setCart(cart.map((item) => (item.meal_id === mealId ? { ...item, quantity } : item)));
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      setBanner({ type: "error", message: "Please add at least one meal to your cart" });
      return;
    }

    if (!selectedHub) {
      setBanner({ type: "error", message: "Please select a hub" });
      return;
    }

    // Check if address is available
    if (!address.street || !address.city || !address.state || !address.pincode) {
      setShowAddressModal(true);
      return;
    }

    if (!coordinates) {
      // Try to get coordinates from selected address
      const selectedAddress = savedAddresses.find((addr) => addr.id === selectedAddressId);
      if (selectedAddress?.coordinates) {
        setCoordinates(selectedAddress.coordinates);
      } else {
        setBanner({ type: "error", message: "Please add a delivery address" });
        setShowAddressModal(true);
        return;
      }
    }

    setLoading((prev) => ({ ...prev, submitting: true }));
    setBanner(null);

    try {
      const orderData = {
        meal_items: cart.map((item) => ({
          meal_id: item.meal_id,
          quantity: item.quantity,
        })),
        delivery_address: {
          ...address,
          location: {
            type: "Point",
            coordinates: coordinates ? [coordinates.lng, coordinates.lat] : [0, 0],
          },
        },
        hub_id: selectedHub._id,
        meal_type: mealType,
      };

      const result = await authorizedFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(orderData),
      });

      setBanner({ type: "success", message: "Order placed successfully!" });
      setCart([]);
      // Clear cart from localStorage after successful order
      if (typeof window !== "undefined") {
        localStorage.removeItem("cart");
      }
      setSelectedHub(null);
      setAddress({ street: "", city: "", state: "", pincode: "" });
      setCoordinates(null);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to place order" });
    } finally {
      setLoading((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Book your meal</p>
          <h2 className="text-2xl font-semibold text-white">Book Tiffin</h2>
          <p className="text-xs text-slate-400">Select your meals and delivery address</p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Meals Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
            <h3 className="mb-4 text-xl font-semibold text-white">Available Meals</h3>
            {loading.meals ? (
              <p className="text-slate-400">Loading meals...</p>
            ) : meals.length === 0 ? (
              <p className="text-slate-400">No meals available</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {meals.map((meal) => (
                  <div
                    key={meal._id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 transition hover:border-slate-700"
                  >
                    {meal.image_url && (
                      <img src={meal.image_url} alt={meal.name} className="mb-3 h-32 w-full rounded-xl object-cover" />
                    )}
                    <h4 className="font-semibold text-white">{meal.name}</h4>
                    {meal.description && <p className="mt-1 text-sm text-slate-400">{meal.description}</p>}
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-semibold text-white">₹{meal.price}</span>
                        {meal.available_quantity !== undefined && (
                          <p className="text-xs text-slate-400">
                            {meal.available_quantity > 0 ? (
                              <span className="text-emerald-400">{meal.available_quantity} available</span>
                            ) : (
                              <span className="text-rose-400">Out of stock</span>
                            )}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => addToCart(meal)}
                        disabled={meal.available_quantity === 0 || meal.is_available === false}
                        className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hub Selection Section */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Select Hub</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setHubSelectionMethod("manual")}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                    hubSelectionMethod === "manual"
                      ? "bg-sky-500 text-slate-950"
                      : "border border-slate-700 bg-slate-900/50 text-slate-300"
                  }`}
                >
                  Select Hub
                </button>
                <button
                  type="button"
                  onClick={() => setHubSelectionMethod("address")}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                    hubSelectionMethod === "address"
                      ? "bg-sky-500 text-slate-950"
                      : "border border-slate-700 bg-slate-900/50 text-slate-300"
                  }`}
                >
                  Find by Address
                </button>
              </div>
            </div>

            {hubSelectionMethod === "manual" ? (
              <div className="space-y-4">
                {loading.hubs ? (
                  <p className="text-slate-400">Loading hubs...</p>
                ) : hubs.length === 0 ? (
                  <p className="text-slate-400">No hubs available</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {hubs.map((hub) => (
                      <button
                        key={hub._id}
                        type="button"
                        onClick={() => {
                          setSelectedHub(hub);
                          setBanner({ type: "success", message: `Hub selected: ${hub.name}` });
                        }}
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
                {selectedHub && (
                  <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                    <p className="text-sm font-semibold text-emerald-100">Selected Hub: {selectedHub.name}</p>
                    <p className="text-xs text-emerald-200">
                      {selectedHub.address.street}, {selectedHub.address.city}, {selectedHub.address.state} -{" "}
                      {selectedHub.address.pincode}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleAddressSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Street</label>
                  <input
                    type="text"
                    value={address.street}
                    onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="Street address"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">City</label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="City"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">State</label>
                  <input
                    type="text"
                    value={address.state}
                    onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="State"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-slate-300">Pincode</label>
                  <input
                    type="text"
                    value={address.pincode}
                    onChange={(e) => setAddress((prev) => ({ ...prev, pincode: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                    placeholder="Pincode"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading.hub}
                className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading.hub ? "Finding Hub..." : "Find Nearest Hub"}
              </button>
              {selectedHub && (
                <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3">
                  <p className="text-sm font-semibold text-emerald-100">Selected Hub: {selectedHub.name}</p>
                  <p className="text-xs text-emerald-200">
                    {selectedHub.address.street}, {selectedHub.address.city}, {selectedHub.address.state} -{" "}
                    {selectedHub.address.pincode}
                  </p>
                </div>
              )}
            </form>
            )}
          </div>

          {/* Delivery Address Section - shown after hub selection */}
          {selectedHub && (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">Delivery Address</h3>
                <button
                  onClick={() => {
                    setShowAddAddressForm(true);
                    setShowAddressModal(true);
                  }}
                  className="rounded-xl border border-sky-500 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
                >
                  + Add Address
                </button>
              </div>

              {savedAddresses.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="mb-4 text-slate-400">No saved addresses. Add one to continue.</p>
                  <button
                    onClick={() => {
                      setShowAddAddressForm(true);
                      setShowAddressModal(true);
                    }}
                    className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                  >
                    Add Address
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`rounded-2xl border p-4 transition ${
                        selectedAddressId === addr.id
                          ? "border-sky-500 bg-sky-500/10"
                          : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <button
                          type="button"
                          onClick={() => handleSelectAddress(addr.id)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-full border-2 ${
                                selectedAddressId === addr.id
                                  ? "border-sky-500 bg-sky-500"
                                  : "border-slate-600"
                              }`}
                            >
                              {selectedAddressId === addr.id && (
                                <div className="h-full w-full rounded-full bg-sky-500" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-white">
                                {addr.street}, {addr.city}
                              </p>
                              <p className="text-sm text-slate-400">
                                {addr.state} - {addr.pincode}
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="ml-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs text-rose-300 transition hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart Section */}
        <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
          <h3 className="mb-4 text-xl font-semibold text-white">Your Order</h3>
          {cart.length === 0 ? (
            <p className="text-slate-400">Your cart is empty</p>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.meal_id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{item.meal_name}</p>
                      <p className="text-xs text-slate-400">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.meal_id, item.quantity - 1)}
                        className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white transition hover:bg-slate-700"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-sm text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.meal_id, item.quantity + 1)}
                        className="rounded-lg bg-slate-800 px-2 py-1 text-sm text-white transition hover:bg-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-800 pt-4">
                <div className="flex items-center justify-between text-lg font-semibold text-white">
                  <span>Total</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={loading.submitting || !selectedHub}
                  className="mt-4 w-full rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading.submitting ? "Placing Order..." : "Place Order"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Address Selection Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-white">
                {showAddAddressForm ? "Add New Address" : "Select Delivery Address"}
              </h3>
              <button
                onClick={() => {
                  setShowAddressModal(false);
                  setShowAddAddressForm(false);
                }}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-slate-300 transition hover:bg-slate-800"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {showAddAddressForm ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveAddress();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">Street</label>
                    <input
                      type="text"
                      value={address.street}
                      onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                      placeholder="Street address"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">City</label>
                    <input
                      type="text"
                      value={address.city}
                      onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                      placeholder="City"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">State</label>
                    <input
                      type="text"
                      value={address.state}
                      onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                      placeholder="State"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">Pincode</label>
                    <input
                      type="text"
                      value={address.pincode}
                      onChange={(e) => setAddress((prev) => ({ ...prev, pincode: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                      placeholder="Pincode"
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddAddressForm(false);
                      if (savedAddresses.length === 0) {
                        setShowAddressModal(false);
                      }
                    }}
                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
                  >
                    Save Address
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {savedAddresses.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="mb-4 text-slate-400">No saved addresses. Please add one.</p>
                    <button
                      onClick={() => setShowAddAddressForm(true)}
                      className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400"
                    >
                      Add Address
                    </button>
                  </div>
                ) : (
                  <>
                    {savedAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`rounded-2xl border p-4 transition ${
                          selectedAddressId === addr.id
                            ? "border-sky-500 bg-sky-500/10"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectAddress(addr.id)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-5 w-5 rounded-full border-2 ${
                                selectedAddressId === addr.id
                                  ? "border-sky-500 bg-sky-500"
                                  : "border-slate-600"
                              }`}
                            >
                              {selectedAddressId === addr.id && (
                                <div className="h-full w-full rounded-full bg-sky-500" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-white">
                                {addr.street}, {addr.city}
                              </p>
                              <p className="text-sm text-slate-400">
                                {addr.state} - {addr.pincode}
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowAddAddressForm(true)}
                      className="w-full rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-sky-500 hover:bg-sky-500/10 hover:text-sky-300"
                    >
                      + Add New Address
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

