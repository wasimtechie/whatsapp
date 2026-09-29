"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";

export async function setWorkspaceLifecycle(
  workspaceId: string,
  lifecycle: "ACTIVE" | "SUSPENDED",
) {
  if (!(await isPlatformAdmin())) throw new Error("Forbidden");
  const actor = await getCurrentUser();
  await prisma.workspace.update({
    where: { id: workspaceId },
    data: { lifecycle },
  });
  await prisma.auditLog.create({
    data: {
      workspaceId,
      actorId: actor?.id,
      action: lifecycle === "SUSPENDED" ? "admin.suspend" : "admin.restore",
      reason: "Platform admin lifecycle change",
    },
  });
  revalidatePath("/app/admin");
}
