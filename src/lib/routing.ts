import { prisma } from "@/lib/db";

/** Assign the accepted teammate with the fewest open or pending chats. */
export async function assignRoundRobin(workspaceId: string) {
  const members = await prisma.membership.findMany({
    where: {
      workspaceId,
      inviteState: "ACCEPTED",
      role: { in: ["AGENT", "OWNER", "MANAGER"] },
    },
    orderBy: { createdAt: "asc" },
  });
  if (members.length === 0) return null;

  const counts = await Promise.all(
    members.map((member) =>
      prisma.conversation.count({
        where: {
          workspaceId,
          assigneeId: member.userId,
          state: { in: ["OPEN", "PENDING"] },
        },
      }),
    ),
  );

  let best = 0;
  for (let i = 1; i < counts.length; i++) {
    if (counts[i] < counts[best]) best = i;
  }
  return members[best]?.userId ?? null;
}
