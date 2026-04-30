"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

type User = {
    _id: string;
    name: string;
    email: string;
    role_id: {
        _id: string;
        name: string;
    };
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
    manager_id?: User;
    contact_number: string;
};

function getAuthToken() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("authToken");
}

function getUserRole() {
    if (typeof window === "undefined") return null;
    try {
        const authUser = localStorage.getItem("authUser");
        if (authUser) {
            const user = JSON.parse(authUser);
            return user.role;
        }
    } catch (e) {
        return null;
    }
    return null;
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

export default function HubsView() {
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState<string | null>(null); // hub ID being updated
    const [manageHub, setManageHub] = useState<Hub | null>(null); // Hub selected for editing
    const [selectedManager, setSelectedManager] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Form state for creating hub
    const [newHub, setNewHub] = useState({
        name: "",
        street: "",
        city: "",
        state: "",
        pincode: "",
        contact_number: ""
    });

    useEffect(() => {
        fetchData();
        const role = getUserRole();
        // Check if role is admin string or object (depending on how backend sends it)
        // Usually it's a string name based on previous findings, but let's be safe
        setIsAdmin(role === 'admin' || (typeof role === 'object' && role?.name === 'admin'));
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [hubsData, usersData] = await Promise.all([
                authorizedFetch("/api/hubs"),
                authorizedFetch("/api/users"),
            ]);
            setHubs(Array.isArray(hubsData) ? hubsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (hub: Hub) => {
        setManageHub(hub);
        setSelectedManager(hub.manager_id?._id || "");
        setError(null);
        setSuccess(null);
    };

    const handleSaveManager = async () => {
        if (!manageHub) return;

        try {
            setUpdating(manageHub._id);
            setError(null);

            const res = await authorizedFetch(`/api/hubs/${manageHub._id}`, {
                method: "PUT",
                body: JSON.stringify({ manager_id: selectedManager || null }),
            });

            setSuccess(`Manager updated for ${manageHub.name}`);
            setManageHub(null);
            fetchData(); // Refresh list
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update hub");
        } finally {
            setUpdating(null);
        }
    };

    const handleCreateHub = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError(null);

        try {
            await authorizedFetch("/api/hubs", {
                method: "POST",
                body: JSON.stringify({
                    name: newHub.name,
                    contact_number: newHub.contact_number,
                    address: {
                        street: newHub.street,
                        city: newHub.city,
                        state: newHub.state,
                        pincode: newHub.pincode
                    }
                })
            });

            setSuccess("Hub created successfully");
            setShowCreateModal(false);
            setNewHub({ name: "", street: "", city: "", state: "", pincode: "", contact_number: "" });
            fetchData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create hub");
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="text-center text-slate-400 p-8">Loading hubs...</div>;

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <p className="text-sm text-slate-400">Operations Network</p>
                    <h2 className="text-2xl font-semibold text-white">Hub Management</h2>
                    <p className="text-xs text-slate-400">
                        Monitor and manage distribution hubs and their assigned managers.
                    </p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
                    >
                        + Create Hub
                    </button>
                )}
            </header>

            {error && (
                <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                </div>
            )}

            {success && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                    {success}
                </div>
            )}

            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-semibold text-white">Active Hubs</h3>
                        <p className="text-sm text-slate-400">
                            {hubs.length} hub{hubs.length !== 1 ? "s" : ""} operational
                        </p>
                    </div>
                    <button
                        onClick={fetchData}
                        disabled={loading}
                        className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading ? "Loading..." : "Refresh"}
                    </button>
                </div>

                {hubs.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-slate-400">No hubs found.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {hubs.map((hub) => (
                            <div
                                key={hub._id}
                                className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 transition hover:border-slate-700"
                            >
                                <div className="mb-4">
                                    <h4 className="text-lg font-semibold text-white">{hub.name}</h4>
                                    <p className="mt-1 text-sm text-slate-400">
                                        {hub.address.street}, {hub.address.city}
                                    </p>
                                </div>

                                <div className="mb-6 space-y-3">
                                    <div className="flex items-center justify-between rounded-xl bg-slate-900/50 px-3 py-2">
                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Manager</span>
                                        <span className={`text-sm font-medium ${hub.manager_id ? "text-emerald-300" : "text-amber-400"}`}>
                                            {hub.manager_id ? hub.manager_id.name : "Unassigned"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-sm text-slate-500">Contact</span>
                                        <span className="text-sm text-slate-300">{hub.contact_number}</span>
                                    </div>
                                </div>

                                {isAdmin && (
                                    <button
                                        onClick={() => handleEditClick(hub)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <svg
                                                className="h-4 w-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                                />
                                            </svg>
                                            Assign Manager
                                        </span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {manageHub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setManageHub(null)}>
                    <div
                        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-semibold text-white">Assign Manager</h3>
                                <p className="mt-1 text-sm text-slate-400">{manageHub.name}</p>
                            </div>
                            <button
                                onClick={() => setManageHub(null)}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium text-slate-400">Select User</label>
                            <select
                                value={selectedManager}
                                onChange={(e) => setSelectedManager(e.target.value)}
                                className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                            >
                                <option value="">Select a user...</option>
                                {users.map((user) => (
                                    <option key={user._id} value={user._id}>
                                        {user.name} ({user.role_id?.name || "No Role"})
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-slate-500">
                                This user will have full operational access to the hub portal.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setManageHub(null)}
                                className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveManager}
                                disabled={updating === manageHub._id}
                                className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {updating === manageHub._id ? "Saving..." : "Save Assignments"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Hub Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
                    <div
                        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-white">Create New Hub</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreateHub} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm text-slate-300">Hub Name</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.name}
                                        onChange={e => setNewHub({ ...newHub, name: e.target.value })}
                                        placeholder="e.g. Central Kitchen"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-slate-300">Contact Number</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.contact_number}
                                        onChange={e => setNewHub({ ...newHub, contact_number: e.target.value })}
                                        placeholder="e.g. 9876543210"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="mb-1 block text-sm text-slate-300">Street Address</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.street}
                                        onChange={e => setNewHub({ ...newHub, street: e.target.value })}
                                        placeholder="e.g. 123 Main St"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-slate-300">City</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.city}
                                        onChange={e => setNewHub({ ...newHub, city: e.target.value })}
                                        placeholder="e.g. Mumbai"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-slate-300">State</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.state}
                                        onChange={e => setNewHub({ ...newHub, state: e.target.value })}
                                        placeholder="e.g. MH"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm text-slate-300">Pincode</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
                                        value={newHub.pincode}
                                        onChange={e => setNewHub({ ...newHub, pincode: e.target.value })}
                                        placeholder="e.g. 400001"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {creating ? "Creating..." : "Create Hub"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
