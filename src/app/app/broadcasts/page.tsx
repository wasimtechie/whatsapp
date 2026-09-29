import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell, EmptyState } from "@/components/app/AppPageShell";

export default async function BroadcastsPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const campaigns = workspaceId
    ? await prisma.campaign.findMany({
        where: { workspaceId },
        include: { template: true, _count: { select: { recipients: true } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <AppPageShell
      title="Broadcasts"
      description="Send template campaigns to consented audiences"
      action={{ href: "/app/broadcasts/new", label: "New broadcast" }}
    >
      {campaigns.length === 0 ? (
        <EmptyState
          title="No broadcasts yet"
          body="Create a campaign from an approved template."
          href="/app/templates"
          cta="Browse templates →"
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
                  {c.template.name} · {c._count.recipients} recipients
                  {c.estimatedCost != null
                    ? ` · est. ₹${Number(c.estimatedCost).toLocaleString("en-IN")}`
                    : ""}
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
    </AppPageShell>
  );
}
