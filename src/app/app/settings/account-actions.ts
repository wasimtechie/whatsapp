"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp";

export async function beginMfa() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  if (user.mfaEnabled) return;
  const secret = user.mfaSecret ?? generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaSecret: secret, mfaEnabled: false },
  });
  revalidatePath("/app/settings");
}

export async function confirmMfa(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.mfaSecret) throw new Error("Start MFA setup first.");
  const code = String(formData.get("code") ?? "");
  if (!verifyTotp(user.mfaSecret, code)) throw new Error("That code is not valid.");
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: true },
  });
  revalidatePath("/app/settings");
}

export async function disableMfa(formData: FormData) {
  const user = await getCurrentUser();
  if (!user?.mfaSecret) return;
  const code = String(formData.get("code") ?? "");
  if (!verifyTotp(user.mfaSecret, code)) throw new Error("That code is not valid.");
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null },
  });
  revalidatePath("/app/settings");
}

export async function totpSetup(email: string, secret: string | null) {
  if (!secret) return null;
  return { secret, uri: totpUri(email, secret) };
}

const PLANS = {
  starter: { seats: 3, numbersLimit: 1, name: "starter" },
  growth: { seats: 10, numbersLimit: 3, name: "growth" },
} as const;

export async function startCheckout(formData: FormData) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership || membership.role !== "OWNER") {
    throw new Error("Only the owner can change billing.");
  }
  const planKey = String(formData.get("plan") ?? "starter") as keyof typeof PLANS;
  const plan = PLANS[planKey] ?? PLANS.starter;
  const secret = process.env.STRIPE_SECRET_KEY;
  const price =
    planKey === "growth"
      ? process.env.STRIPE_PRICE_GROWTH
      : process.env.STRIPE_PRICE_STARTER;
  if (!secret || !price) {
    throw new Error("Set STRIPE_SECRET_KEY and the Stripe price id for this plan.");
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const body = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": price,
    "line_items[0][quantity]": "1",
    success_url: `${origin}/app/settings?billing=success`,
    cancel_url: `${origin}/app/settings?billing=cancel`,
    client_reference_id: membership.workspaceId,
    "metadata[workspaceId]": membership.workspaceId,
    "metadata[plan]": plan.name,
    customer_email: user!.email,
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = (await res.json()) as { url?: string; error?: { message?: string } };
  if (!res.ok || !json.url) {
    throw new Error(json.error?.message ?? "Stripe checkout failed.");
  }
  const { redirect } = await import("next/navigation");
  redirect(json.url);
}

export { PLANS };
