"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const INVITE_ROLES: Role[] = ["MANAGER", "AGENT", "ANALYST"];

export async function inviteTeammate(formData: FormData) {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  if (!membership || membership.role !== "OWNER") {
    throw new Error("Only the workspace owner can invite people.");
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "AGENT") as Role;
  if (!email || !INVITE_ROLES.includes(role)) {
    throw new Error("Enter an email and a role.");
  }

  const invitee = await prisma.user.findUnique({ where: { email } });
  if (!invitee) {
    throw new Error("That email has no account yet. Ask them to sign up, then invite them.");
  }
  if (invitee.id === user!.id) throw new Error("You are already in this workspace.");

  const existing = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: { userId: invitee.id, workspaceId: membership.workspaceId },
    },
  });
  if (existing && existing.inviteState === "ACCEPTED") {
    throw new Error("That person is already on the team.");
  }

  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId: membership.workspaceId },
  });
  const used = await prisma.membership.count({
    where: {
      workspaceId: membership.workspaceId,
      inviteState: { in: ["ACCEPTED", "PENDING"] },
    },
  });
  if (subscription && used >= subscription.seats && !existing) {
    throw new Error(`This plan includes ${subscription.seats} seats.`);
  }

  const inviteToken = randomBytes(18).toString("hex");
  const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (existing) {
    await prisma.membership.update({
      where: { id: existing.id },
      data: { role, inviteState: "PENDING", inviteToken, inviteExpiresAt },
    });
  } else {
    await prisma.membership.create({
      data: {
        userId: invitee.id,
        workspaceId: membership.workspaceId,
        role,
        inviteState: "PENDING",
        inviteToken,
        inviteExpiresAt,
      },
    });
  }

  revalidatePath("/app/team");
}

export async function acceptInvite(token: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "Sign in with the invited email first." };

  const membership = await prisma.membership.findFirst({
    where: { inviteToken: token },
  });
  if (!membership || membership.userId !== user.id) {
    return { ok: false as const, error: "This invite is not for the signed-in account." };
  }
  if (membership.inviteExpiresAt && membership.inviteExpiresAt < new Date()) {
    await prisma.membership.update({
      where: { id: membership.id },
      data: { inviteState: "EXPIRED" },
    });
    return { ok: false as const, error: "This invite has expired." };
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { inviteState: "ACCEPTED", inviteToken: null },
  });
  revalidatePath("/app/team");
  return { ok: true as const };
}
