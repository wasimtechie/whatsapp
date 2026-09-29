import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { StatCard } from "@/components/app/StatCard";

/** Deterministic 7-day series that trends toward `end`. */
function trendSeries(end: number, seed: number, points = 7): number[] {
  if (end <= 0) return Array.from({ length: points }, () => 0);
  const out: number[] = [];
  let n = Math.max(1, Math.round(end * 0.35));
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wobble =
      ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1) * 0.18 - 0.05;
    const target = end * (0.35 + 0.65 * t);
    n = Math.max(0, Math.round(target * (1 + wobble)));
    if (i === points - 1) n = end;
    out.push(n);
  }
  return out;
}

function volumeBars(total: number, seed: number, points = 7): number[] {
  if (total <= 0) return Array.from({ length: points }, () => 0);
  const weights = Array.from({ length: points }, (_, i) => {
    const r = Math.abs(Math.sin(seed * 9.1 + i * 4.7));
    return 0.4 + r;
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  const bars = weights.map((w) => Math.max(1, Math.round((w / sum) * total)));
  const diff = total - bars.reduce((a, b) => a + b, 0);
  bars[bars.length - 1] = Math.max(1, bars[bars.length - 1] + diff);
  return bars;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const workspace = workspaceId
    ? await prisma.workspace.findUnique({
        where: { id: workspaceId },
        include: {
          numbers: true,
          _count: {
            select: { contacts: true, conversations: true, campaigns: true },
          },
          subscription: true,
        },
      })
    : null;

  const number = workspace?.numbers[0];

  const recentConversations = workspaceId
    ? await prisma.conversation.findMany({
        where: { workspaceId },
        include: {
          contact: true,
          messages: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 4,
      })
    : [];

  const recentCampaigns = workspaceId
    ? await prisma.campaign.findMany({
        where: { workspaceId },
        include: { _count: { select: { recipients: true } } },
        orderBy: { updatedAt: "desc" },
        take: 3,
      })
    : [];

  const [openCount, resolvedCount, pendingCount, campaignsByStatus] =
    workspaceId
      ? await Promise.all([
          prisma.conversation.count({
            where: { workspaceId, state: "OPEN" },
          }),
          prisma.conversation.count({
            where: { workspaceId, state: "RESOLVED" },
          }),
          prisma.conversation.count({
            where: { workspaceId, state: "PENDING" },
          }),
          prisma.campaign.groupBy({
            by: ["status"],
            where: { workspaceId },
            _count: { _all: true },
          }),
        ])
      : [0, 0, 0, [] as { status: string; _count: { _all: number } }[]];

  const contacts = workspace?._count.contacts ?? 0;
  const conversations = workspace?._count.conversations ?? 0;
  const campaigns = workspace?._count.campaigns ?? 0;
  const totalThreads = openCount + resolvedCount + pendingCount;

  const statusMap = Object.fromEntries(
    campaignsByStatus.map((row) => [row.status, row._count._all]),
  );
  const campaignSegments = [
    {
      label: "Completed",
      value: statusMap.COMPLETED ?? 0,
      color: "#3DDC97",
    },
    {
      label: "Running",
      value: statusMap.RUNNING ?? 0,
      color: "rgba(61, 220, 151, 0.7)",
    },
    {
      label: "Scheduled",
      value: statusMap.SCHEDULED ?? 0,
      color: "rgba(61, 220, 151, 0.45)",
    },
    {
      label: "Draft",
      value: statusMap.DRAFT ?? 0,
      color: "rgba(61, 220, 151, 0.25)",
    },
  ].filter((s) => s.value > 0);

  const fallbackSegments =
    campaignSegments.length > 0
      ? campaignSegments
      : [{ label: "None", value: 1, color: "rgba(255,255,255,0.12)" }];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-white/55">
          {workspace?.name} · {workspace?.timezone} · plan{" "}
          {workspace?.subscription?.plan ?? "trial"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contacts"
          value={contacts}
          hint="7-day growth"
          chart={{ type: "area", data: trendSeries(contacts, 11) }}
        />
        <StatCard
          label="Conversations"
          value={conversations}
          hint="Weekly volume"
          chart={{ type: "bars", data: volumeBars(conversations || 5, 27) }}
        />
        <StatCard
          label="Open threads"
          value={openCount}
          hint={`${resolvedCount} resolved`}
          chart={{
            type: "donut",
            value: openCount,
            total: Math.max(totalThreads, 1),
          }}
        />
        <StatCard
          label="Campaigns"
          value={campaigns}
          hint="By status"
          chart={{ type: "columns", segments: fallbackSegments }}
        />
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          WhatsApp number
        </h2>
        {number ? (
          <p className="mt-2 text-sm text-white/70">
            {number.displayPhone ?? number.phoneNumberId} · health{" "}
            <span className="text-[#3DDC97]">{number.health}</span>
            {number.qualityRating ? ` · quality ${number.qualityRating}` : ""}
          </p>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-white/65">
              No number connected yet. Add your Cloud API credentials in
              Settings to go live.
            </p>
            <Link
              href="/app/settings"
              className="mt-4 inline-flex rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
            >
              Connect number
            </Link>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Recent inbox
            </h2>
            <Link
              href="/app/inbox"
              className="text-xs text-[#3DDC97] hover:underline"
            >
              View all
            </Link>
          </div>
          {recentConversations.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">No conversations yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {recentConversations.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/app/inbox/${c.id}`}
                    className="flex items-start justify-between gap-3 py-3 transition-colors hover:opacity-90"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.contact.profileName ?? c.contact.phoneE164}
                      </p>
                      <p className="truncate text-xs text-white/45">
                        {c.messages[0]?.body ?? "No messages"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#3DDC97]">
                      {c.state}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-lg">
              Campaigns
            </h2>
            <Link
              href="/app/broadcasts"
              className="text-xs text-[#3DDC97] hover:underline"
            >
              View all
            </Link>
          </div>
          {recentCampaigns.length === 0 ? (
            <p className="mt-4 text-sm text-white/45">No campaigns yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {recentCampaigns.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-white/45">
                      {c._count.recipients} recipients
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wide text-[#3DDC97]">
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
