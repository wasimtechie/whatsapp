import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell, EmptyState } from "@/components/app/AppPageShell";

export default async function PendingPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const conversations = workspaceId
    ? await prisma.conversation.findMany({
        where: {
          workspaceId,
          state: "PENDING",
        },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
      })
    : [];

  return (
    <AppPageShell
      title="Pending requests"
      description="Open and pending conversations waiting for a human"
      action={{ href: "/app/inbox", label: "Open inbox" }}
    >
      {conversations.length === 0 ? (
        <EmptyState
          title="Inbox zero"
          body="No open or pending threads right now."
          href="/app/chatbots"
          cta="Review chat bots →"
        />
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {conversations.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {c.contact.profileName ?? c.contact.phoneE164}
                </p>
                <p className="text-xs text-white/45">
                  {c.messages[0]?.body ?? "No messages"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-[#3DDC97]">
                  {c.state}
                </span>
                <Link
                  href={`/app/inbox/${c.id}`}
                  className="text-xs text-white/50 hover:text-[#3DDC97]"
                >
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AppPageShell>
  );
}
