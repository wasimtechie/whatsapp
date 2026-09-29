import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey() {
  const raw = `bi_${randomBytes(24).toString("hex")}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 10) };
}

export async function authenticateApiKey(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const raw = header.replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith("bi_")) return null;
  const key = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(raw) },
  });
  if (!key || key.revokedAt) return null;
  const workspace = await prisma.workspace.findUnique({
    where: { id: key.workspaceId },
  });
  if (!workspace || workspace.lifecycle === "SUSPENDED" || workspace.lifecycle === "CANCELLED") {
    return null;
  }
  const presented = Buffer.from(hashApiKey(raw));
  const stored = Buffer.from(key.keyHash);
  if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) {
    return null;
  }
  await prisma.apiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });
  return { workspaceId: key.workspaceId, keyId: key.id };
}
