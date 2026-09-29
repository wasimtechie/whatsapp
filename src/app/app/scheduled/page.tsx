import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell, EmptyState } from "@/components/app/AppPageShell";
import { releaseDueBroadcasts } from "@/app/app/broadcasts/actions";

export default async function ScheduledPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const campaigns = workspaceId
    ? await prisma.campaign.findMany({
        where: {
          workspaceId,
          status: { in: ["SCHEDULED", "DRAFT", "PAUSED"] },
        },
        include: { template: true, _count: { select: { recipients: true } } },
        orderBy: { scheduledAt: "asc" },
      })
    : [];

  return (
    <AppPageShell
      title="Scheduled Broadcasts"
      description="Upcoming and draft sends in Asia/Kolkata"
      action={{ href: "/app/broadcasts", label: "All broadcasts" }}
    >
      {campaigns.length === 0 ? (
        <EmptyState
          title="Nothing scheduled"
          body="Schedule a broadcast from an approved template."
          href="/app/broadcasts/new"
          cta="Create a broadcast →"
        />
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-4 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-white/45">
                  {c.template.name} · {c._count.recipients} recipients ·{" "}
                  {c.scheduledAt
                    ? new Date(c.scheduledAt).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "Not scheduled"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-wide text-[#3DDC97]">
                  {c.status}
                </span>
                <Link
                  href={`/app/broadcasts/${c.id}`}
                  className="text-xs text-white/50 hover:text-[#3DDC97]"
                >
                  Review
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form action={releaseDueBroadcasts}>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80"
        >
          Send broadcasts that are due
        </button>
      </form>
      <p className="text-sm text-white/45">
        Need a template?{" "}
        <Link href="/app/templates" className="text-[#3DDC97] hover:underline">
          Browse templates
        </Link>
      </p>
    </AppPageShell>
  );
}
