import { prisma } from "@/lib/db";

export async function workspaceCanSend(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { lifecycle: true },
  });
  if (!workspace) return false;
  return workspace.lifecycle !== "SUSPENDED" && workspace.lifecycle !== "CANCELLED";
}
