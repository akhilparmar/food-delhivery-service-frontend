"use client";

import { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

type Permission = {
  _id: string;
  name: string;
  module?: string;
  description?: string;
};

type Role = {
  _id: string;
  name: string;
  permissions: Permission[];
};

type Banner = { type: "success" | "error"; message: string } | null;

const defaultRoleForm = { name: "", permissionIds: [] as string[] };

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

// Create Role Modal Component
function CreateRoleModal({
  isOpen,
  onClose,
  permissions,
  onSuccess,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  permissions: Permission[];
  onSuccess: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState(defaultRoleForm);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("Role name is required");
      return;
    }

    try {
      await authorizedFetch("/api/roles/role", {
        method: "POST",
        body: JSON.stringify({ name: form.name, permissionIds: form.permissionIds }),
      });
      setForm(defaultRoleForm);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Create New Role</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="role-name">
              Role Name
            </label>
            <input
              id="role-name"
              type="text"
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400"
              placeholder="e.g., Manager, Editor, Viewer"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="role-permissions">
              Select Permissions
            </label>
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
              {permissions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">No permissions available</p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <label
                      key={perm._id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissionIds.includes(perm._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm((prev) => ({ ...prev, permissionIds: [...prev.permissionIds, perm._id] }));
                          } else {
                            setForm((prev) => ({
                              ...prev,
                              permissionIds: prev.permissionIds.filter((id) => id !== perm._id),
                            }));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-2 focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{perm.name}</p>
                        {perm.module && <p className="text-xs text-slate-400">{perm.module}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Select one or more permissions for this role</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating..." : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Role Modal Component
function EditRoleModal({
  isOpen,
  onClose,
  role,
  permissions,
  onSuccess,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  role: Role | null;
  permissions: Permission[];
  onSuccess: () => void;
  loading: boolean;
}) {
  const [permissionIds, setPermissionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize permissionIds when role changes
  useEffect(() => {
    if (role && isOpen) {
      setPermissionIds(role.permissions?.map((p) => p._id) || []);
    }
  }, [role, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!role) return;

    try {
      await authorizedFetch(`/api/roles/role/${role._id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({ permissionIds }),
      });
      await onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role permissions");
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPermissionIds([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Edit Role Permissions</h3>
            <p className="mt-1 text-sm text-slate-400">{role.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-slate-300">Select Permissions</label>
            <div className="max-h-64 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
              {permissions.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">No permissions available</p>
              ) : (
                <div className="space-y-2">
                  {permissions.map((perm) => (
                    <label
                      key={perm._id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-slate-800/50"
                    >
                      <input
                        type="checkbox"
                        checked={permissionIds.includes(perm._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setPermissionIds((prev) => [...prev, perm._id]);
                          } else {
                            setPermissionIds((prev) => prev.filter((id) => id !== perm._id));
                          }
                        }}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-2 focus:ring-sky-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{perm.name}</p>
                        {perm.module && <p className="text-xs text-slate-400">{perm.module}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {permissionIds.length} permission{permissionIds.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Updating..." : "Update Permissions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RolesPermissionsView() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [banner, setBanner] = useState<Banner>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState({ permissions: false, roles: false, creatingRole: false, updatingRole: false });

  const loadPermissions = async () => {
    setLoading((prev) => ({ ...prev, permissions: true }));
    try {
      const data = await authorizedFetch("/api/roles/permissions");
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load permissions" });
    } finally {
      setLoading((prev) => ({ ...prev, permissions: false }));
    }
  };

  const loadRoles = async () => {
    setLoading((prev) => ({ ...prev, roles: true }));
    try {
      const data = await authorizedFetch("/api/roles/roles");
      setRoles(Array.isArray(data) ? (data as Role[]) : []);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Unable to load roles" });
    } finally {
      setLoading((prev) => ({ ...prev, roles: false }));
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setBanner({ type: "error", message: "No auth token found. Please log in again." });
      return;
    }
    loadPermissions();
    loadRoles();
  }, []);

  const handleCreateRoleSuccess = () => {
    setBanner({ type: "success", message: "Role created successfully!" });
    loadRoles();
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setIsEditModalOpen(true);
  };

  const handleUpdateRoleSuccess = async () => {
    setLoading((prev) => ({ ...prev, updatingRole: true }));
    try {
      await loadRoles();
      setBanner({ type: "success", message: "Role permissions updated successfully!" });
      setIsEditModalOpen(false);
      setEditingRole(null);
    } catch (error) {
      setBanner({ type: "error", message: error instanceof Error ? error.message : "Failed to update role" });
    } finally {
      setLoading((prev) => ({ ...prev, updatingRole: false }));
    }
  };

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-slate-900 bg-slate-900/70 px-6 py-5 shadow-lg shadow-black/30 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-slate-400">Access control</p>
          <h2 className="text-2xl font-semibold text-white">Roles & Permissions</h2>
          <p className="text-xs text-slate-400">
            Manage roles and their associated permissions for your organization.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400"
        >
          + Create Role
        </button>
      </header>

      {banner ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${banner.type === "success"
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
            : "border-rose-500/40 bg-rose-500/10 text-rose-100"
            }`}
        >
          {banner.message}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-black/30">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white">Roles</h3>
            <p className="text-sm text-slate-400">
              {roles.length} role{roles.length !== 1 ? "s" : ""} defined
            </p>
          </div>
          <button
            onClick={loadRoles}
            disabled={loading.roles}
            className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading.roles ? "Loading..." : "Refresh"}
          </button>
        </div>

        {loading.roles ? (
          <div className="py-12 text-center">
            <p className="text-slate-400">Loading roles...</p>
          </div>
        ) : roles.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400">No roles created yet. Click "Create Role" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {roles.map((role) => {
              const isAdmin = role.name.toLowerCase() === "admin";
              return (
                <div
                  key={role._id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 transition hover:border-slate-700"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">
                        {role.name}
                        {isAdmin && (
                          <span className="ml-2 rounded-lg bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                            Admin
                          </span>
                        )}
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {role.permissions?.length || 0} permission{role.permissions?.length === 1 ? "" : "s"} assigned
                      </p>
                    </div>
                    <button
                      onClick={() => handleEditRole(role)}
                      // disabled={isAdmin}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isAdmin
                        // ? "" "cursor-not-allowed border border-slate-700 bg-slate-900/30 text-slate-500 opacity-50"
                        ? ""
                        : "border border-slate-700 bg-slate-900/50 text-slate-300 hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                        }`}
                      title={isAdmin ? "Admin role permissions cannot be edited" : "Edit permissions"}
                    >
                      <svg
                        className="h-4 w-4 inline-block mr-1.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      Edit
                    </button>
                  </div>

                  {role.permissions && role.permissions.length > 0 ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Permissions
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((perm) => (
                          <span
                            key={perm._id}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                            {perm.name}
                            {perm.module && (
                              <span className="ml-1 text-slate-500">({perm.module})</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-3">
                      <p className="text-sm text-slate-500">No permissions assigned to this role</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        permissions={permissions}
        onSuccess={handleCreateRoleSuccess}
        loading={loading.creatingRole}
      />

      <EditRoleModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRole(null);
        }}
        role={editingRole}
        permissions={permissions}
        onSuccess={handleUpdateRoleSuccess}
        loading={loading.updatingRole}
      />
    </>
  );
}
