"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isServiceWindowOpen } from "@/lib/serviceWindow";
import { workspaceCanSend } from "@/lib/workspace-access";
import { placeholderIndexes, templateBody } from "@/lib/campaigns";

export type MediaType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "location"
  | "contact"
  | "sticker"
  | "template"
  | "note";

export type SendPayload = {
  conversationId: string;
  body?: string;
  mediaType?: MediaType;
  mediaRef?: string | null;
  mediaMeta?: Record<string, unknown>;
  replyToId?: string | null;
  templateName?: string | null;
};

export type SendReplyResult =
  | { ok: true; messageId: string; provider: "meta" | "local" }
  | { ok: false; error: string };

function revalidateConversation(conversationId: string) {
  revalidatePath("/app/inbox");
  revalidatePath(`/app/inbox/${conversationId}`);
  revalidatePath("/app/pending");
  revalidatePath("/app");
}

export async function sendInboxReply(
  payload: SendPayload | string,
  bodyArg?: string,
): Promise<SendReplyResult> {
  // Back-compat: sendInboxReply(conversationId, body)
  const data: SendPayload =
    typeof payload === "string"
      ? { conversationId: payload, body: bodyArg ?? "", mediaType: "text" }
      : payload;

  const mediaType = data.mediaType ?? "text";
  const text = (data.body ?? "").trim();
  const needsBody = mediaType === "text" || mediaType === "template";

  if (needsBody && !text && mediaType === "text") {
    return { ok: false, error: "Message cannot be empty." };
  }
  if (text.length > 4096) return { ok: false, error: "Message is too long." };

  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false, error: "Unauthorized." };
  if (!(await workspaceCanSend(membership.workspaceId))) {
    return { ok: false, error: "This workspace is suspended." };
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: data.conversationId,
      workspaceId: membership.workspaceId,
    },
    include: { contact: true, number: true },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };

  const windowOpen = isServiceWindowOpen(conversation.lastCustomerAt);
  const freeForm = mediaType !== "template" && mediaType !== "note";
  if (freeForm && !windowOpen) {
    return {
      ok: false,
      error:
        "The 24-hour service window is closed. Send an approved template instead.",
    };
  }

  if (data.replyToId) {
    const parent = await prisma.message.findFirst({
      where: {
        id: data.replyToId,
        conversationId: conversation.id,
        workspaceId: membership.workspaceId,
      },
    });
    if (!parent) return { ok: false, error: "Reply target not found." };
  }

  const idempotencyKey = `out:${data.conversationId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  const message = await prisma.message.create({
    data: {
      workspaceId: membership.workspaceId,
      conversationId: conversation.id,
      numberId: conversation.numberId,
      direction: "OUTBOUND",
      status: "QUEUED",
      body: text || mediaLabel(mediaType, data.mediaMeta),
      mediaType,
      mediaRef: data.mediaRef ?? null,
      mediaMeta: (data.mediaMeta ?? {}) as Prisma.InputJsonValue,
      replyToId: data.replyToId ?? null,
      templateName: data.templateName ?? null,
      idempotencyKey,
    },
  });

  let provider: "meta" | "local" = "local";
  let status: "SENT" | "FAILED" = "SENT";
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  const token = conversation.number.accessTokenEnc;
  const isDemoToken =
    !token ||
    token.startsWith("demo-") ||
    conversation.number.phoneNumberId.startsWith("demo_");

  if (!isDemoToken && token && (mediaType === "text" || mediaType === "template")) {
    const to = conversation.contact.phoneE164.replace(/^\+/, "");
    let templateLanguage = String(data.mediaMeta?.language ?? "en");
    let templateParameters: { type: "text"; text: string }[] = [];
    if (mediaType === "template" && data.templateName) {
      const tpl = await prisma.template.findFirst({
        where: {
          workspaceId: membership.workspaceId,
          name: data.templateName,
          status: "APPROVED",
        },
      });
      if (tpl) {
        templateLanguage = tpl.language;
        const indexes = placeholderIndexes(templateBody(tpl.components));
        const name = conversation.contact.profileName || "there";
        templateParameters = indexes.map(() => ({ type: "text" as const, text: name }));
      }
    }
    const payload =
      mediaType === "template" && data.templateName
        ? {
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
              name: data.templateName,
              language: { code: templateLanguage },
              ...(templateParameters.length
                ? {
                    components: [
                      { type: "body", parameters: templateParameters },
                    ],
                  }
                : {}),
            },
          }
        : {
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text },
            ...(data.replyToId ? { context: { message_id: data.replyToId } } : {}),
          };
    try {
      const res = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION ?? "v21.0"}/${conversation.number.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = (await res.json()) as {
        messages?: { id?: string }[];
        error?: { message?: string };
      };
      if (!res.ok) {
        status = "FAILED";
        errorMessage = json.error?.message ?? "Meta API send failed";
      } else {
        provider = "meta";
        providerId = json.messages?.[0]?.id ?? null;
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }
  } else {
    providerId = `local_${message.id}`;
  }

  await prisma.message.update({
    where: { id: message.id },
    data: { status, providerId, errorMessage },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      state: conversation.state === "RESOLVED" ? "OPEN" : conversation.state,
      assigneeId: user!.id,
    },
  });

  revalidateConversation(data.conversationId);

  if (status === "FAILED") {
    return { ok: false, error: errorMessage ?? "Failed to send message." };
  }
  return { ok: true, messageId: message.id, provider };
}

export async function fetchConversationMessages(conversationId: string) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false as const, error: "Unauthorized" };

  const messages = await prisma.message.findMany({
    where: { conversationId, workspaceId: membership.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  return {
    ok: true as const,
    messages: messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      status: m.status,
      body: m.body,
      mediaType: m.mediaType,
      mediaRef: m.mediaRef,
      mediaMeta:
        typeof m.mediaMeta === "object" && m.mediaMeta
          ? (m.mediaMeta as Record<string, unknown>)
          : {},
      replyToId: m.replyToId,
      reactions: Array.isArray(m.reactions)
        ? (m.reactions as { emoji: string; by: string }[])
        : [],
      templateName: m.templateName,
      deletedAt: m.deletedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
      errorMessage: m.errorMessage,
    })),
  };
}

export async function sendMediaFile(formData: FormData): Promise<SendReplyResult> {
  const file = formData.get("file");
  const conversationId = String(formData.get("conversationId") ?? "");
  const mediaType = String(formData.get("mediaType") ?? "document") as MediaType;
  if (!(file instanceof File)) return { ok: false, error: "Choose a file." };
  if (file.size > 16 * 1024 * 1024) {
    return { ok: false, error: "File must be under 16 MB." };
  }
  if (!["image", "video", "audio", "document"].includes(mediaType)) {
    return { ok: false, error: "Unsupported file type." };
  }

  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false, error: "Unauthorized." };
  if (!(await workspaceCanSend(membership.workspaceId))) {
    return { ok: false, error: "This workspace is suspended." };
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, workspaceId: membership.workspaceId },
    include: { contact: true, number: true },
  });
  if (!conversation) return { ok: false, error: "Conversation not found." };
  if (!isServiceWindowOpen(conversation.lastCustomerAt)) {
    return {
      ok: false,
      error: "The 24-hour service window is closed. Send an approved template.",
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "file";
  const { mkdir, writeFile } = await import("fs/promises");
  const { join } = await import("path");
  const dir = join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const stored = `${Date.now()}-${safeName}`;
  await writeFile(join(dir, stored), bytes);
  const localRef = `/uploads/${stored}`;

  const token = conversation.number.accessTokenEnc ?? "";
  const demo =
    !token ||
    token.startsWith("demo-") ||
    conversation.number.phoneNumberId.startsWith("demo_");

  let provider: "meta" | "local" = "local";
  let status: "SENT" | "FAILED" = "SENT";
  let providerId: string | null = null;
  let errorMessage: string | null = null;
  let metaMediaId: string | null = null;

  if (!demo) {
    try {
      const version = process.env.META_API_VERSION ?? "v21.0";
      const upload = new FormData();
      upload.set("messaging_product", "whatsapp");
      upload.set("type", file.type || "application/octet-stream");
      upload.set("file", new Blob([bytes], { type: file.type || "application/octet-stream" }), safeName);
      const uploaded = await fetch(
        `https://graph.facebook.com/${version}/${conversation.number.phoneNumberId}/media`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: upload },
      );
      const uploadedJson = (await uploaded.json()) as { id?: string; error?: { message?: string } };
      if (!uploaded.ok || !uploadedJson.id) {
        status = "FAILED";
        errorMessage = uploadedJson.error?.message ?? "Media upload failed";
      } else {
        metaMediaId = uploadedJson.id;
        const mediaBody =
          mediaType === "image"
            ? { image: { id: metaMediaId, caption: safeName } }
            : mediaType === "video"
              ? { video: { id: metaMediaId, caption: safeName } }
              : mediaType === "audio"
                ? { audio: { id: metaMediaId } }
                : { document: { id: metaMediaId, filename: safeName } };
        const sent = await fetch(
          `https://graph.facebook.com/${version}/${conversation.number.phoneNumberId}/messages`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: conversation.contact.phoneE164.replace(/^\+/, ""),
              type: mediaType,
              ...mediaBody,
            }),
          },
        );
        const sentJson = (await sent.json()) as {
          messages?: { id?: string }[];
          error?: { message?: string };
        };
        if (!sent.ok) {
          status = "FAILED";
          errorMessage = sentJson.error?.message ?? "Meta API send failed";
        } else {
          provider = "meta";
          providerId = sentJson.messages?.[0]?.id ?? null;
        }
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }
  }

  const message = await prisma.message.create({
    data: {
      workspaceId: membership.workspaceId,
      conversationId: conversation.id,
      numberId: conversation.numberId,
      direction: "OUTBOUND",
      status,
      body: safeName,
      mediaType,
      mediaRef: localRef,
      providerId,
      errorMessage,
      mediaMeta: { fileName: safeName, mimeType: file.type, metaMediaId },
      idempotencyKey: `out:media:${conversation.id}:${Date.now()}`,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date(), assigneeId: user!.id },
  });
  revalidateConversation(conversation.id);
  if (status === "FAILED") return { ok: false, error: errorMessage ?? "Failed to send file." };
  return { ok: true, messageId: message.id, provider };
}

export async function addInternalNote(conversationId: string, body: string) {
  const text = body.trim();
  if (!text) return { ok: false as const, error: "Note cannot be empty." };
  return sendInboxReply({
    conversationId,
    body: text,
    mediaType: "note",
    mediaMeta: { internal: true },
  });
}

function mediaLabel(type: MediaType, meta?: Record<string, unknown>) {
  switch (type) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎬 Video";
    case "audio":
      return "🎤 Voice message";
    case "document":
      return `📄 ${String(meta?.fileName ?? "Document")}`;
    case "location":
      return `📍 ${String(meta?.name ?? "Location")}`;
    case "contact":
      return `👤 ${String(meta?.name ?? "Contact")}`;
    case "sticker":
      return "Sticker";
    case "template":
      return `Template: ${String(meta?.templateName ?? "message")}`;
    default:
      return "";
  }
}

export async function reactToMessage(messageId: string, emoji: string) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false as const, error: "Unauthorized" };

  const message = await prisma.message.findFirst({
    where: { id: messageId, workspaceId: membership.workspaceId },
  });
  if (!message) return { ok: false as const, error: "Not found" };

  const current = Array.isArray(message.reactions)
    ? (message.reactions as { emoji: string; by: string }[])
    : [];
  const existing = current.findIndex(
    (r) => r.emoji === emoji && r.by === user!.id,
  );
  const next =
    existing >= 0
      ? current.filter((_, i) => i !== existing)
      : [...current, { emoji, by: user!.id }];

  await prisma.message.update({
    where: { id: messageId },
    data: { reactions: next },
  });

  revalidateConversation(message.conversationId);
  return { ok: true as const };
}

export async function deleteMessage(messageId: string) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false as const, error: "Unauthorized" };

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      workspaceId: membership.workspaceId,
      direction: "OUTBOUND",
    },
  });
  if (!message) return { ok: false as const, error: "Not found" };

  await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      body: "This message was deleted",
      mediaType: "text",
      mediaRef: null,
    },
  });

  revalidateConversation(message.conversationId);
  return { ok: true as const };
}

export async function forwardMessage(
  messageId: string,
  targetConversationId: string,
) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return { ok: false as const, error: "Unauthorized" };

  const source = await prisma.message.findFirst({
    where: { id: messageId, workspaceId: membership.workspaceId },
  });
  if (!source || source.deletedAt) {
    return { ok: false as const, error: "Message not found" };
  }

  const target = await prisma.conversation.findFirst({
    where: { id: targetConversationId, workspaceId: membership.workspaceId },
  });
  if (!target) return { ok: false as const, error: "Target not found" };

  return sendInboxReply({
    conversationId: targetConversationId,
    body: source.body ? `Forwarded: ${source.body}` : "Forwarded message",
    mediaType: (source.mediaType as MediaType) || "text",
    mediaRef: source.mediaRef,
    mediaMeta: {
      ...(typeof source.mediaMeta === "object" && source.mediaMeta
        ? (source.mediaMeta as Record<string, unknown>)
        : {}),
      forwarded: true,
      fromMessageId: source.id,
    },
  });
}

export async function updateConversationState(
  conversationId: string,
  state: "OPEN" | "PENDING" | "RESOLVED",
) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) throw new Error("Unauthorized");

  await prisma.conversation.updateMany({
    where: { id: conversationId, workspaceId: membership.workspaceId },
    data: { state },
  });

  revalidateConversation(conversationId);
}
