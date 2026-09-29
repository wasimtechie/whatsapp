"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function syncTemplates() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership || (membership.role !== "OWNER" && membership.role !== "MANAGER")) {
    throw new Error("Only owners and managers can sync templates.");
  }

  const number = await prisma.whatsAppAccount.findFirst({
    where: { workspaceId: membership.workspaceId },
  });
  const token = number?.accessTokenEnc ?? "";
  if (
    !number?.wabaId ||
    !token ||
    token.startsWith("demo-") ||
    number.phoneNumberId.startsWith("demo_")
  ) {
    throw new Error("Add a WABA ID and a Cloud API token in Settings before syncing.");
  }

  const version = process.env.META_API_VERSION ?? "v21.0";
  const res = await fetch(
    `https://graph.facebook.com/${version}/${number.wabaId}/message_templates?limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const json = (await res.json()) as {
    data?: {
      id?: string;
      name?: string;
      language?: string;
      status?: string;
      category?: string;
      components?: unknown;
      rejected_reason?: string;
    }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message ?? "Meta template sync failed.");
  }

  let count = 0;
  for (const tpl of json.data ?? []) {
    if (!tpl.name || !tpl.language) continue;
    await prisma.template.upsert({
      where: {
        workspaceId_name_language: {
          workspaceId: membership.workspaceId,
          name: tpl.name,
          language: tpl.language,
        },
      },
      create: {
        workspaceId: membership.workspaceId,
        name: tpl.name,
        language: tpl.language,
        category: tpl.category ?? null,
        status: tpl.status ?? "PENDING",
        components: (tpl.components ?? []) as Prisma.InputJsonValue,
        providerId: tpl.id ?? null,
        rejectionReason: tpl.rejected_reason ?? null,
      },
      update: {
        category: tpl.category ?? null,
        status: tpl.status ?? "PENDING",
        components: (tpl.components ?? []) as Prisma.InputJsonValue,
        providerId: tpl.id ?? null,
        rejectionReason: tpl.rejected_reason ?? null,
      },
    });
    count += 1;
  }

  revalidatePath("/app/templates");
  revalidatePath("/app/broadcasts/new");
  void count;
}
