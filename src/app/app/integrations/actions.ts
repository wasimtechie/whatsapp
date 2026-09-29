"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateApiKey } from "@/lib/api-key";

async function requireManager() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
    return null;
  }
  return membership;
}

export async function createApiKey(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const name = String(formData.get("name") ?? "").trim() || "API key";
  const key = generateApiKey();
  await prisma.apiKey.create({
    data: {
      workspaceId: membership.workspaceId,
      name,
      keyHash: key.hash,
      prefix: key.prefix,
    },
  });
  revalidatePath("/app/integrations");
  return key.raw;
}

export async function revokeApiKey(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const id = String(formData.get("id") ?? "");
  await prisma.apiKey.updateMany({
    where: { id, workspaceId: membership.workspaceId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidatePath("/app/integrations");
}

export async function saveOutboundWebhook(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const url = String(formData.get("url") ?? "").trim();
  if (!url.startsWith("https://")) throw new Error("Webhook URL must start with https://");
  const events = formData.getAll("events").map(String);
  await prisma.outboundWebhook.create({
    data: {
      workspaceId: membership.workspaceId,
      url,
      secret: randomBytes(24).toString("hex"),
      events: events.length ? events : ["message.inbound"],
    },
  });
  revalidatePath("/app/integrations");
}

export async function disableOutboundWebhook(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const id = String(formData.get("id") ?? "");
  await prisma.outboundWebhook.updateMany({
    where: { id, workspaceId: membership.workspaceId },
    data: { enabled: false },
  });
  revalidatePath("/app/integrations");
}
