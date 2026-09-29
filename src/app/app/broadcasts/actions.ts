"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  classifyRecipient,
  estimateInr,
  launchCampaign,
  placeholderIndexes,
  summarize,
  templateBody,
} from "@/lib/campaigns";

async function requireManager() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return null;
  if (membership.role !== "OWNER" && membership.role !== "MANAGER") return null;
  return membership;
}

function readVariables(formData: FormData) {
  const map: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("var_")) continue;
    map[key.slice(4)] = String(value);
  }
  return map;
}

export async function createBroadcast(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Only owners and managers can create broadcasts.");

  const name = String(formData.get("name") ?? "").trim();
  const templateId = String(formData.get("templateId") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  const when = String(formData.get("scheduledAt") ?? "").trim();
  if (!name || !templateId) throw new Error("Name and template are required.");

  const [template, number, contacts] = await Promise.all([
    prisma.template.findFirst({
      where: {
        id: templateId,
        workspaceId: membership.workspaceId,
        status: "APPROVED",
      },
    }),
    prisma.whatsAppAccount.findFirst({
      where: { workspaceId: membership.workspaceId },
    }),
    prisma.contact.findMany({
      where: {
        workspaceId: membership.workspaceId,
        ...(tag ? { tags: { has: tag } } : {}),
      },
    }),
  ]);

  if (!template) throw new Error("Choose an approved template.");
  if (!number) throw new Error("Connect a WhatsApp number in Settings first.");

  const indexes = placeholderIndexes(templateBody(template.components));
  const variableMap = readVariables(formData);
  const decisions = contacts.map((contact) =>
    classifyRecipient(contact, template.category, indexes, variableMap),
  );
  const counts = summarize(decisions);
  const scheduledAt = when ? new Date(`${when}:00+05:30`) : null;
  if (when && (!scheduledAt || Number.isNaN(scheduledAt.getTime()))) {
    throw new Error("Schedule time is invalid.");
  }
  if (scheduledAt && scheduledAt.getTime() <= Date.now()) {
    throw new Error("Schedule a future time, or leave it blank.");
  }

  const campaign = await prisma.campaign.create({
    data: {
      workspaceId: membership.workspaceId,
      numberId: number.id,
      templateId: template.id,
      name,
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      timezone: "Asia/Kolkata",
      scheduledAt,
      estimatedCost: estimateInr(template.category, counts.eligible),
      segmentSnapshot: {
        tag: tag || null,
        ...counts,
        total: contacts.length,
      } as Prisma.InputJsonValue,
      variableMap: variableMap as Prisma.InputJsonValue,
      recipients: {
        create: decisions.map((decision) => ({
          contactId: decision.contact.id,
          status: decision.status,
          failureReason: decision.reason,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      workspaceId: membership.workspaceId,
      action: "campaign.create",
      reason: name,
      meta: { campaignId: campaign.id, ...counts },
    },
  });

  revalidatePath("/app/broadcasts");
  revalidatePath("/app/scheduled");
  redirect(`/app/broadcasts/${campaign.id}`);
}

export async function launchBroadcast(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const campaignId = String(formData.get("campaignId") ?? "");
  const result = await launchCampaign(membership.workspaceId, campaignId);
  revalidatePath("/app/broadcasts");
  revalidatePath(`/app/broadcasts/${campaignId}`);
  revalidatePath("/app/scheduled");
  revalidatePath("/app/inbox");
  if (!result.ok) throw new Error(result.error);
}

export async function cancelBroadcast(formData: FormData) {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");
  const campaignId = String(formData.get("campaignId") ?? "");
  await prisma.campaign.updateMany({
    where: {
      id: campaignId,
      workspaceId: membership.workspaceId,
      status: { in: ["DRAFT", "SCHEDULED", "PAUSED"] },
    },
    data: { status: "CANCELLED" },
  });
  revalidatePath("/app/broadcasts");
  revalidatePath(`/app/broadcasts/${campaignId}`);
  revalidatePath("/app/scheduled");
}

export async function releaseDueBroadcasts() {
  const membership = await requireManager();
  if (!membership) throw new Error("Forbidden");

  const due = await prisma.campaign.findMany({
    where: {
      workspaceId: membership.workspaceId,
      status: "SCHEDULED",
      scheduledAt: { lte: new Date() },
    },
  });

  for (const campaign of due) {
    await launchCampaign(membership.workspaceId, campaign.id);
  }

  revalidatePath("/app/broadcasts");
  revalidatePath("/app/scheduled");
  revalidatePath("/app/inbox");
}
