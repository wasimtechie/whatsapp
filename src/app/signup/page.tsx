"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
        workspaceName: fd.get("workspaceName"),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Signup failed");
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
          Create your workspace
        </h1>
        <p className="mt-2 text-sm text-white/65">
          India-first trial · 3 seats · 1 WhatsApp number
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Your name" name="name" required />
          <Field label="Work email" name="email" type="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            required
            minLength={8}
          />
          <Field label="Workspace name" name="workspaceName" required />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[#3DDC97] py-2.5 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8] disabled:opacity-60"
          >
            {loading ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/55">
          Already have an account?{" "}
          <Link href="/login" className="text-[#3DDC97] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="text-white/75">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        className="mt-1.5 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
      />
    </label>
  );
}
