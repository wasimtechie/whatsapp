import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InboxShell } from "@/components/app/InboxShell";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;

  const conversations = workspaceId
    ? await prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          contact: true,
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 80,
      })
    : [];

  const items = conversations.map((c) => {
    const last = c.messages[0] ?? null;
    const unread =
      (c.state === "OPEN" || c.state === "PENDING") &&
      last?.direction === "INBOUND"
        ? 1
        : 0;
    return {
      id: c.id,
      name: c.contact.profileName ?? c.contact.phoneE164,
      phone: c.contact.phoneE164,
      preview: last?.body ?? "No messages yet",
      previewOutbound: last?.direction === "OUTBOUND",
      previewStatus: last?.status ?? null,
      mediaType: last?.mediaType ?? "text",
      time: (c.lastMessageAt ?? c.updatedAt).toISOString(),
      state: c.state,
      unread,
    };
  });

  return (
    <InboxShell
      userInitial={(user?.name ?? user?.email ?? "A").slice(0, 1).toUpperCase()}
      items={items}
    >
      {children}
    </InboxShell>
  );
}
