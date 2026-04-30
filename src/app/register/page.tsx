"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";
const heroImage =
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1600&q=80&sat=-10";

type RegisterForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: string;
};

type RegisterResponse = {
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data: RegisterResponse = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to register right now.");
      }

      setSuccess(data.message || "Account created successfully. Redirecting to sign-in.");
      setTimeout(() => router.push("/login"), 1500);
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
            <h1 className="text-4xl font-semibold text-white">Create an account</h1>
            <p className="text-sm text-slate-400">
              Spin up secure access for hub managers, dispatch teams, and culinary partners.
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Access policy</p>
              <p className="mt-1">
                All registrations require verification. Choose the role that best matches your responsibilities.
              </p>
            </div>
          </section>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="text-sm font-medium text-slate-200">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                  placeholder="Jordan Michaels"
                  autoComplete="name"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-medium text-slate-200">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                  placeholder="team@solstice.app"
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="phone" className="text-sm font-medium text-slate-200">
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  required
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                  placeholder="+1 555 000 1234"
                  autoComplete="tel"
                />
              </div>

              <div>
                <label htmlFor="role" className="text-sm font-medium text-slate-200">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition focus:border-sky-400"
                >
                  <option value="customer">Customer</option>
                  <option value="hub_manager">Hub Manager</option>
                  <option value="driver">Driver</option>
                </select>
              </div>

              <div className="sm:col-span-2">
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
                  autoComplete="new-password"
                />
              </div>
            </div>

            {error ? (
              <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200" role="alert">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200" role="status">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-sky-500 px-4 py-3 text-center text-sm font-semibold text-slate-950 shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already registered?{" "}
              <Link href="/login" className="text-sky-300 hover:text-sky-100">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

