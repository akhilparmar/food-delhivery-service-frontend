"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
const heroImage =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1600&q=80&sat=-15";

type LoginForm = {
  email: string;
  password: string;
};

type AuthResponse = {
  message?: string;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: string;
    permissions?: string[];
  };
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data: AuthResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to sign in right now.");
      }

      if (data.token && typeof window !== "undefined") {
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("authUser", JSON.stringify(data.user ?? {}));
        document.cookie = `authToken=${data.token}; path=/; max-age=604800; sameSite=strict`;
        window.dispatchEvent(new StorageEvent("storage", { key: "authToken", newValue: data.token }));
      }

      router.push("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.78), rgba(2,6,23,0.85)), url(${heroImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-12">
        <div className="grid gap-10 rounded-3xl border border-white/10 bg-slate-950/60 p-8 shadow-2xl shadow-black/40 lg:grid-cols-2">
          <section className="space-y-6">
            <p className="text-sm uppercase tracking-[0.3rem] text-slate-400">Solstice Kitchens</p>
            <h1 className="text-4xl font-semibold text-white">Welcome back</h1>
            <p className="text-sm text-slate-400">
              Sign in to access live operations, orchestrate hubs, and keep deliveries on schedule.
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Need an account?</p>
              <p className="mt-1">
                Request access for your team and start coordinating nationwide fulfillment in minutes.
              </p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                placeholder="ops@solstice.app"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-slate-200">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error ? (
              <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <p className="text-center text-sm text-slate-400">
              Need to create an account?{" "}
              <Link href="/register" className="text-sky-300 hover:text-sky-100">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

