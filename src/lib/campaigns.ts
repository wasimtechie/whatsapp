import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { workspaceCanSend } from "@/lib/workspace-access";
import { dispatchOutbound } from "@/lib/outbound";

const RATE_INR: Record<string, number> = {
  MARKETING: 0.88,
  UTILITY: 0.35,
  AUTHENTICATION: 0.35,
};

export type AudienceContact = {
  id: string;
  phoneE164: string;
  profileName: string | null;
  tags: string[];
  categoryPerms: string[];
  consentAt: Date | null;
  suppressed: boolean;
};

export type AudienceDecision = {
  contact: AudienceContact;
  status: "QUEUED" | "SUPPRESSED" | "FAILED";
  reason: string | null;
  values: string[];
};

export function templateBody(components: unknown) {
  if (!Array.isArray(components)) return "";
  const body = components.find(
    (item) =>
      item &&
      typeof item === "object" &&
      "type" in item &&
      String((item as { type?: string }).type).toUpperCase() === "BODY" &&
      "text" in item,
  ) as { text?: string } | undefined;
  return body?.text ?? "";
}

export function placeholderIndexes(text: string) {
  const found = new Set<number>();
  for (const match of text.matchAll(/\{\{(\d+)\}\}/g)) {
    found.add(Number(match[1]));
  }
  return [...found].sort((a, b) => a - b);
}

export function renderTemplate(text: string, values: string[]) {
  return text.replace(/\{\{(\d+)\}\}/g, (_, index: string) => {
    return values[Number(index) - 1] ?? "";
  });
}

export function classifyRecipient(
  contact: AudienceContact,
  category: string | null,
  indexes: number[],
  variableMap: Record<string, string>,
): AudienceDecision {
  const phoneOk = /^\+[1-9]\d{7,14}$/.test(contact.phoneE164);
  if (!phoneOk) {
    return {
      contact,
      status: "FAILED",
      reason: "Invalid phone number",
      values: [],
    };
  }
  if (contact.suppressed) {
    return {
      contact,
      status: "SUPPRESSED",
      reason: contact.suppressed ? "Suppressed" : null,
      values: [],
    };
  }
  if (!contact.consentAt) {
    return {
      contact,
      status: "FAILED",
      reason: "Missing consent",
      values: [],
    };
  }
  const needed = (category ?? "marketing").toLowerCase();
  if (
    (needed === "marketing" || needed === "utility" || needed === "authentication") &&
    !contact.categoryPerms.map((p) => p.toLowerCase()).includes(needed)
  ) {
    return {
      contact,
      status: "FAILED",
      reason: `Missing ${needed} permission`,
      values: [],
    };
  }

  const values: string[] = [];
  for (const index of indexes) {
    const raw = (variableMap[String(index)] ?? "").trim();
    if (!raw) {
      return {
        contact,
        status: "FAILED",
        reason: `Missing variable {{${index}}}`,
        values: [],
      };
    }
    values[index - 1] = resolveToken(raw, contact);
  }

  return { contact, status: "QUEUED", reason: null, values };
}

function resolveToken(
  raw: string,
  contact: { profileName: string | null; phoneE164: string },
) {
  if (raw === "name" || raw === "{{name}}") return contact.profileName || "there";
  if (raw === "phone" || raw === "{{phone}}") return contact.phoneE164;
  return raw
    .replaceAll("{{name}}", contact.profileName || "there")
    .replaceAll("{{phone}}", contact.phoneE164);
}

export function summarize(decisions: AudienceDecision[]) {
  return {
    eligible: decisions.filter((d) => d.status === "QUEUED").length,
    suppressed: decisions.filter((d) => d.status === "SUPPRESSED").length,
    failed: decisions.filter((d) => d.status === "FAILED").length,
  };
}

export function estimateInr(category: string | null, eligible: number) {
  const rate = RATE_INR[(category ?? "MARKETING").toUpperCase()] ?? RATE_INR.MARKETING;
  return Math.round(eligible * rate * 100) / 100;
}

export async function launchCampaign(workspaceId: string, campaignId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: {
      template: true,
      number: true,
      recipients: { include: { contact: true } },
    },
  });
  if (!campaign) return { ok: false as const, error: "Campaign not found." };
  if (!(await workspaceCanSend(workspaceId))) {
    return { ok: false as const, error: "This workspace is suspended." };
  }
  if (campaign.template.status !== "APPROVED") {
    return { ok: false as const, error: "Only approved templates can be sent." };
  }
  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    return { ok: false as const, error: "This campaign is already finished." };
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "RUNNING" },
  });

  const bodyText = templateBody(campaign.template.components);
  const variableMap =
    campaign.variableMap && typeof campaign.variableMap === "object"
      ? (campaign.variableMap as Record<string, string>)
      : {};
  const indexes = placeholderIndexes(bodyText);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of campaign.recipients) {
    if (recipient.status !== "QUEUED") {
      skipped += 1;
      continue;
    }

    const fresh = await prisma.contact.findFirst({
      where: { id: recipient.contactId, workspaceId },
    });
    if (!fresh || fresh.suppressed) {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: "OPTED_OUT",
          failureReason: "Suppressed before send",
        },
      });
      skipped += 1;
      continue;
    }

    const decision = classifyRecipient(
      fresh,
      campaign.template.category,
      indexes,
      variableMap,
    );
    if (decision.status !== "QUEUED") {
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: decision.status === "SUPPRESSED" ? "OPTED_OUT" : "FAILED",
          failureReason: decision.reason,
        },
      });
      if (decision.status === "FAILED") failed += 1;
      else skipped += 1;
      continue;
    }

    const rendered = renderTemplate(bodyText, decision.values);
    const result = await deliverTemplate({
      workspaceId,
      campaignId: campaign.id,
      number: campaign.number,
      contact: fresh,
      templateName: campaign.template.name,
      language: campaign.template.language,
      values: indexes.map((index) => decision.values[index - 1] ?? ""),
      rendered,
    });

    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: {
        status: result.ok ? "ACCEPTED" : "FAILED",
        providerId: result.providerId,
        failureReason: result.ok ? null : result.error,
        sentAt: result.ok ? new Date() : null,
      },
    });

    if (result.ok) sent += 1;
    else failed += 1;
  }

  await prisma.campaign.update({
    where: { id: campaign.id },
    data: { status: "COMPLETED" },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId,
      action: "campaign.launch",
      reason: campaign.name,
      meta: { campaignId: campaign.id, sent, failed, skipped },
    },
  });

  await dispatchOutbound(workspaceId, "campaign.completed", {
    campaignId: campaign.id,
    name: campaign.name,
    sent,
    failed,
    skipped,
  });

  return { ok: true as const, sent, failed, skipped };
}

async function deliverTemplate(input: {
  workspaceId: string;
  campaignId: string;
  number: {
    id: string;
    phoneNumberId: string;
    accessTokenEnc: string | null;
  };
  contact: { id: string; phoneE164: string };
  templateName: string;
  language: string;
  values: string[];
  rendered: string;
}) {
  const conversation = await prisma.conversation.upsert({
    where: {
      workspaceId_numberId_contactId: {
        workspaceId: input.workspaceId,
        numberId: input.number.id,
        contactId: input.contact.id,
      },
    },
    create: {
      workspaceId: input.workspaceId,
      numberId: input.number.id,
      contactId: input.contact.id,
      lastMessageAt: new Date(),
    },
    update: { lastMessageAt: new Date() },
  });

  const idempotencyKey = `camp:${input.campaignId}:${input.contact.id}`;
  const existing = await prisma.message.findUnique({
    where: {
      workspaceId_idempotencyKey: {
        workspaceId: input.workspaceId,
        idempotencyKey,
      },
    },
  });

  const token = input.number.accessTokenEnc ?? "";
  const demo =
    !token ||
    token.startsWith("demo-") ||
    input.number.phoneNumberId.startsWith("demo_");

  let status: "SENT" | "FAILED" = "SENT";
  let providerId: string | null = null;
  let errorMessage: string | null = null;

  if (!demo) {
    try {
      const res = await fetch(
        `https://graph.facebook.com/${process.env.META_API_VERSION ?? "v21.0"}/${input.number.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: input.contact.phoneE164.replace(/^\+/, ""),
            type: "template",
            template: {
              name: input.templateName,
              language: { code: input.language },
              components: input.values.length
                ? [
                    {
                      type: "body",
                      parameters: input.values.map((text) => ({
                        type: "text",
                        text,
                      })),
                    },
                  ]
                : [],
            },
          }),
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
        providerId = json.messages?.[0]?.id ?? null;
      }
    } catch (err) {
      status = "FAILED";
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }
  } else {
    providerId = `local_${input.campaignId}_${input.contact.id}`;
  }

  if (!existing) {
    await prisma.message.create({
      data: {
        workspaceId: input.workspaceId,
        conversationId: conversation.id,
        numberId: input.number.id,
        providerId,
        direction: "OUTBOUND",
        status,
        body: input.rendered || input.templateName,
        mediaType: "template",
        templateName: input.templateName,
        idempotencyKey,
        errorMessage,
        mediaMeta: {
          campaignId: input.campaignId,
          demo,
        } as Prisma.InputJsonValue,
      },
    });
  }

  if (status === "FAILED") {
    return { ok: false as const, error: errorMessage ?? "Send failed", providerId };
  }
  return { ok: true as const, providerId };
}
