"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fd.get("email"),
        password: fd.get("password"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }
    if (data.mfaRequired && data.ticket) {
      setTicket(data.ticket);
      return;
    }
    router.push(data.redirect ?? "/app");
    router.refresh();
  }

  async function onMfa(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/mfa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticket, code: fd.get("code") }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Could not verify the code.");
      return;
    }
    router.push(data.redirect ?? "/app");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B1210] px-6 text-[#F4F7F5]">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-2xl text-[#3DDC97]"
        >
          beyond impossible
        </Link>
        <h1 className="mt-8 font-[family-name:var(--font-display)] text-3xl">
          Welcome back
        </h1>
        {ticket ? (
          <form onSubmit={onMfa} className="mt-8 space-y-4">
            <label className="block text-sm">
              <span className="text-white/75">Authenticator code</span>
              <input
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#3DDC97] py-2.5 text-sm font-semibold text-[#0B1210] disabled:opacity-60"
            >
              {loading ? "Checking…" : "Confirm code"}
            </button>
          </form>
        ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-white/75">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/75">Password</span>
            <input
              name="password"
              type="password"
              required
              className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
            />
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#3DDC97] py-2.5 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Log in"}
          </button>
        </form>
        )}
        <p className="mt-6 text-sm text-white/55">
          New here?{" "}
          <Link href="/signup" className="text-[#3DDC97] hover:underline">
            Create a workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
