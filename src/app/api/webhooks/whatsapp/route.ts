import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runInboundAutomation } from "@/lib/automation";
import { assignRoundRobin } from "@/lib/routing";
import { nextMessageStatus } from "@/lib/serviceWindow";
import { dispatchOutbound } from "@/lib/outbound";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const account = await prisma.whatsAppAccount.findFirst({
    where: { webhookVerifyToken: token },
  });

  if (!account) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.whatsAppAccount.update({
    where: { id: account.id },
    data: { webhookSubscribed: true },
  });

  return new NextResponse(challenge, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") ?? "";
  const appSecret = process.env.META_APP_SECRET ?? "";

  let signatureValid = false;
  if (appSecret && signature.startsWith("sha256=")) {
    const expected = createHash("sha256")
      .update(rawBody)
      .digest("hex");
    const provided = signature.slice("sha256=".length);
    try {
      signatureValid = timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(provided),
      );
    } catch {
      signatureValid = false;
    }
  } else if (process.env.NODE_ENV !== "production") {
    // Allow local dry-runs without Meta secret during Phase 1
    signatureValid = true;
  }

  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const idempotencyKey =
    req.headers.get("x-hub-signature-256") ||
    createHash("sha256").update(rawBody).digest("hex");

  const existing = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Resolve workspace from phone_number_id when present
  const phoneNumberId = extractPhoneNumberId(payload);
  const account = phoneNumberId
    ? await prisma.whatsAppAccount.findFirst({
        where: { phoneNumberId },
      })
    : null;

  await prisma.webhookEvent.create({
    data: {
      workspaceId: account?.workspaceId,
      idempotencyKey,
      signatureValid,
      payload: payload as object,
      processedAt: new Date(),
    },
  });

  // Minimal normalizer: create contact + conversation + message for text inbound
  if (account && payload && typeof payload === "object") {
    await normalizeInbound(account.workspaceId, account.id, payload);
  }

  return NextResponse.json({ ok: true });
}

function extractPhoneNumberId(payload: unknown): string | null {
  try {
    const p = payload as {
      entry?: { changes?: { value?: { metadata?: { phone_number_id?: string } } }[] }[];
    };
    return p.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ?? null;
  } catch {
    return null;
  }
}

async function normalizeInbound(
  workspaceId: string,
  numberId: string,
  payload: unknown,
) {
  const p = payload as {
    entry?: {
      changes?: {
        value?: {
          contacts?: { profile?: { name?: string }; wa_id?: string }[];
          messages?: {
            id?: string;
            from?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
          }[];
          statuses?: {
            id?: string;
            status?: string;
            errors?: { title?: string; message?: string }[];
          }[];
        };
      }[];
    }[];
  };

  const value = p.entry?.[0]?.changes?.[0]?.value;
  await applyStatuses(workspaceId, value?.statuses ?? []);
  const messages = value?.messages ?? [];
  if (!messages.length) return;

  for (const msg of messages) {
    if (!msg.id || !msg.from) continue;
    const idempotencyKey = `meta:${msg.id}`;

    const existingMsg = await prisma.message.findUnique({
      where: {
        workspaceId_idempotencyKey: { workspaceId, idempotencyKey },
      },
    });
    if (existingMsg) continue;

    const profileName =
      value?.contacts?.find((c) => c.wa_id === msg.from)?.profile?.name ?? null;
    const phoneE164 = msg.from.startsWith("+") ? msg.from : `+${msg.from}`;

    const contact = await prisma.contact.upsert({
      where: { workspaceId_phoneE164: { workspaceId, phoneE164 } },
      create: {
        workspaceId,
        phoneE164,
        profileName,
        source: "whatsapp_inbound",
      },
      update: { profileName: profileName ?? undefined },
    });

    const existingConversation = await prisma.conversation.findUnique({
      where: {
        workspaceId_numberId_contactId: {
          workspaceId,
          numberId,
          contactId: contact.id,
        },
      },
    });
    const assigneeId = existingConversation
      ? existingConversation.assigneeId
      : await assignRoundRobin(workspaceId);
    const conversation = existingConversation
      ? await prisma.conversation.update({
          where: { id: existingConversation.id },
          data: {
            state: "OPEN",
            lastCustomerAt: new Date(),
            lastMessageAt: new Date(),
            assigneeId: existingConversation.assigneeId ?? assigneeId,
          },
        })
      : await prisma.conversation.create({
          data: {
            workspaceId,
            numberId,
            contactId: contact.id,
            assigneeId,
            state: "OPEN",
            lastCustomerAt: new Date(),
            lastMessageAt: new Date(),
          },
        });

    await prisma.message.create({
      data: {
        workspaceId,
        conversationId: conversation.id,
        numberId,
        providerId: msg.id,
        direction: "INBOUND",
        status: "DELIVERED",
        body: msg.text?.body ?? `[${msg.type ?? "unsupported"}]`,
        mediaType: msg.type ?? "text",
        idempotencyKey,
      },
    });

    try {
      await dispatchOutbound(workspaceId, "message.inbound", {
        conversationId: conversation.id,
        contactId: contact.id,
        phone: contact.phoneE164,
        messageId: msg.id,
        body: msg.text?.body ?? null,
        type: msg.type ?? "text",
      });
    } catch (err) {
      console.error("[outbound] inbound dispatch failed", err);
    }

    try {
      await runInboundAutomation({
        workspaceId,
        conversationId: conversation.id,
        contactId: contact.id,
        numberId,
        body: msg.text?.body ?? "",
        inboundProviderId: msg.id,
      });
    } catch (err) {
      console.error("[automation] inbound run failed", err);
    }
  }
}

async function applyStatuses(
  workspaceId: string,
  statuses: { id?: string; status?: string; errors?: { title?: string; message?: string }[] }[],
) {
  const map: Record<string, "SENT" | "DELIVERED" | "READ" | "FAILED"> = {
    sent: "SENT",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };
  const recipientMap: Record<string, "ACCEPTED" | "DELIVERED" | "READ" | "FAILED"> = {
    sent: "ACCEPTED",
    delivered: "DELIVERED",
    read: "READ",
    failed: "FAILED",
  };

  for (const status of statuses) {
    if (!status.id || !status.status) continue;
    const next = map[status.status.toLowerCase()];
    if (!next) continue;
    const message = await prisma.message.findFirst({
      where: { workspaceId, providerId: status.id },
    });
    if (message) {
      const advanced = nextMessageStatus(message.status, next);
      if (advanced !== message.status) {
        await prisma.message.update({
          where: { id: message.id },
          data: {
            status: advanced as "SENT" | "DELIVERED" | "READ" | "FAILED",
            errorMessage:
              next === "FAILED"
                ? status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? "Delivery failed"
                : message.errorMessage,
          },
        });
      }
    }

    const recipientNext = recipientMap[status.status.toLowerCase()];
    if (!recipientNext) continue;
    const recipient = await prisma.campaignRecipient.findFirst({
      where: { providerId: status.id, campaign: { workspaceId } },
    });
    if (!recipient) continue;
    const current = recipient.status;
    const order = ["QUEUED", "ACCEPTED", "DELIVERED", "READ"];
    if (
      recipientNext === "FAILED" ||
      order.indexOf(recipientNext) > order.indexOf(current)
    ) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: recipientNext,
          failureReason:
            recipientNext === "FAILED"
              ? status.errors?.[0]?.message ?? "Delivery failed"
              : recipient.failureReason,
        },
      });
    }
  }
}
