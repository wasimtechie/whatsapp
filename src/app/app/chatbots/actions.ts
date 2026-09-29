"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  STARTER_RULES,
  type RuleAction,
  type RuleTrigger,
} from "@/lib/automation";

async function requireManager() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership) return null;
  if (membership.role !== "OWNER" && membership.role !== "MANAGER") return null;
  return { user, membership };
}

export async function seedStarterAutomations() {
  const ctx = await requireManager();
  if (!ctx) return { ok: false as const, error: "Only owners and managers can edit automations." };

  const existing = await prisma.automationRule.count({
    where: { workspaceId: ctx.membership.workspaceId },
  });
  if (existing > 0) return { ok: true as const, created: 0 };

  await prisma.automationRule.createMany({
    data: STARTER_RULES.map((rule) => ({
      workspaceId: ctx.membership.workspaceId,
      name: rule.name,
      priority: rule.priority,
      enabled: true,
      testMode: false,
      trigger: rule.trigger as unknown as Prisma.InputJsonValue,
      actions: rule.actions as unknown as Prisma.InputJsonValue,
    })),
  });

  revalidatePath("/app/chatbots");
  return { ok: true as const, created: STARTER_RULES.length };
}

export async function createAutomation(input: {
  name: string;
  trigger: RuleTrigger;
  reply: string;
  handoff: boolean;
  testMode: boolean;
}) {
  const ctx = await requireManager();
  if (!ctx) return { ok: false as const, error: "Only owners and managers can edit automations." };

  const name = input.name.trim();
  const reply = input.reply.trim();
  if (!name) return { ok: false as const, error: "Name is required." };
  if (!reply) return { ok: false as const, error: "Reply text is required." };

  const actions: RuleAction[] = [{ type: "reply", body: reply }];
  if (input.handoff) actions.push({ type: "handoff" });

  const lowest = await prisma.automationRule.findFirst({
    where: { workspaceId: ctx.membership.workspaceId },
    orderBy: { priority: "desc" },
  });

  await prisma.automationRule.create({
    data: {
      workspaceId: ctx.membership.workspaceId,
      name,
      priority: (lowest?.priority ?? 0) + 10,
      enabled: true,
      testMode: input.testMode,
      trigger: input.trigger as unknown as Prisma.InputJsonValue,
      actions: actions as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/app/chatbots");
  return { ok: true as const };
}

export async function toggleAutomation(
  id: string,
  field: "enabled" | "testMode",
  value: boolean,
) {
  const ctx = await requireManager();
  if (!ctx) return { ok: false as const, error: "Forbidden" };

  await prisma.automationRule.updateMany({
    where: { id, workspaceId: ctx.membership.workspaceId },
    data: { [field]: value },
  });
  revalidatePath("/app/chatbots");
  return { ok: true as const };
}

export async function deleteAutomation(id: string) {
  const ctx = await requireManager();
  if (!ctx) return { ok: false as const, error: "Forbidden" };

  await prisma.automationRule.deleteMany({
    where: { id, workspaceId: ctx.membership.workspaceId },
  });
  revalidatePath("/app/chatbots");
  return { ok: true as const };
}
