import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function formatMinutes(value: number | null) {
  if (value == null) return "—";
  if (value < 60) return `${Math.round(value)} min`;
  const hours = value / 60;
  return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1)} h`;
}

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;

  const [contacts, conversations, open, campaigns, messagesIn, messagesOut, threads, resolved] =
    workspaceId
      ? await Promise.all([
          prisma.contact.count({ where: { workspaceId } }),
          prisma.conversation.count({ where: { workspaceId } }),
          prisma.conversation.count({ where: { workspaceId, state: "OPEN" } }),
          prisma.campaign.count({ where: { workspaceId } }),
          prisma.message.count({ where: { workspaceId, direction: "INBOUND" } }),
          prisma.message.count({
            where: { workspaceId, direction: "OUTBOUND", NOT: { mediaType: "note" } },
          }),
          prisma.conversation.findMany({
            where: { workspaceId },
            include: {
              messages: {
                where: { deletedAt: null },
                orderBy: { createdAt: "asc" },
                select: { direction: true, mediaType: true, createdAt: true },
              },
            },
            take: 200,
            orderBy: { updatedAt: "desc" },
          }),
          prisma.conversation.findMany({
            where: { workspaceId, state: "RESOLVED" },
            select: { createdAt: true, updatedAt: true },
            take: 200,
          }),
        ])
      : [0, 0, 0, 0, 0, 0, [], []];

  const responseMinutes = threads.flatMap((thread) => {
    const firstIn = thread.messages.find((m) => m.direction === "INBOUND");
    if (!firstIn) return [];
    const reply = thread.messages.find(
      (m) =>
        m.direction === "OUTBOUND" &&
        m.mediaType !== "note" &&
        m.createdAt > firstIn.createdAt,
    );
    if (!reply) return [];
    return [(reply.createdAt.getTime() - firstIn.createdAt.getTime()) / 60000];
  });
  const resolutionHours = resolved.map(
    (thread) => (thread.updatedAt.getTime() - thread.createdAt.getTime()) / 3600000,
  );

  const stats = [
    { label: "Contacts", value: String(contacts), href: "/app/customers" },
    { label: "Conversations", value: String(conversations), href: "/app/inbox" },
    { label: "Open threads", value: String(open), href: "/app/pending" },
    { label: "Broadcasts", value: String(campaigns), href: "/app/broadcasts" },
    { label: "Inbound messages", value: String(messagesIn), href: "/app/inbox" },
    { label: "Outbound messages", value: String(messagesOut), href: "/app/broadcasts" },
    {
      label: "Median first response",
      value: formatMinutes(median(responseMinutes)),
      href: "/app/inbox",
    },
    {
      label: "Median time to resolve",
      value: formatMinutes(median(resolutionHours.map((h) => h * 60))),
      href: "/app/inbox",
    },
  ];

  return (
    <AppPageShell
      title="Analytics"
      description="Times use this workspace clock. First response is the gap from the first customer message to the next team or automation reply. Resolution is create-to-resolved on closed chats. Based on the latest 200 conversations."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4 transition-colors hover:border-[#3DDC97]/40"
          >
            <p className="text-xs uppercase tracking-wide text-white/45">{s.label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#3DDC97]">
              {s.value}
            </p>
          </Link>
        ))}
      </div>
    </AppPageShell>
  );
}
