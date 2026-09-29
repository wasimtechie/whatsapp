import { createHmac } from "crypto";
import { prisma } from "@/lib/db";

export async function dispatchOutbound(
  workspaceId: string,
  event: string,
  payload: Record<string, unknown>,
) {
  const hooks = await prisma.outboundWebhook.findMany({
    where: { workspaceId, enabled: true, events: { has: event } },
  });
  await Promise.all(hooks.map((hook) => deliver(hook, event, payload)));
}

async function deliver(
  hook: { id: string; url: string; secret: string },
  event: string,
  payload: Record<string, unknown>,
) {
  const body = JSON.stringify({
    id: `${hook.id}:${Date.now()}`,
    event,
    createdAt: new Date().toISOString(),
    data: payload,
  });
  const signature = createHmac("sha256", hook.secret).update(body).digest("hex");
  try {
    const res = await fetch(hook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Relay-Event": event,
        "X-Relay-Signature": `sha256=${signature}`,
      },
      body,
      signal: AbortSignal.timeout(5000),
    });
    await prisma.outboundWebhookDelivery.create({
      data: {
        webhookId: hook.id,
        event,
        statusCode: res.status,
        ok: res.ok,
        error: res.ok ? null : `HTTP ${res.status}`,
      },
    });
  } catch (err) {
    await prisma.outboundWebhookDelivery.create({
      data: {
        webhookId: hook.id,
        event,
        ok: false,
        error: err instanceof Error ? err.message : "Delivery failed",
      },
    });
  }
}
