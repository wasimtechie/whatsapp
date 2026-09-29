import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { setWorkspaceLifecycle } from "@/app/app/admin/actions";

export default async function AdminPage() {
  if (!(await isPlatformAdmin())) notFound();

  const workspaces = await prisma.workspace.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { contacts: true, conversations: true, memberships: true } },
      subscription: true,
    },
  });
  const audits = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      reason: true,
      createdAt: true,
      workspaceId: true,
    },
  });

  return (
    <AppPageShell
      title="Platform admin"
      description="Tenant status and audit events. Message bodies are not shown here."
    >
      <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
        {workspaces.map((workspace) => (
          <li key={workspace.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium">{workspace.name}</p>
              <p className="text-xs text-white/45">
                {workspace.lifecycle} · {workspace.subscription?.plan ?? workspace.plan} ·{" "}
                {workspace._count.memberships} members · {workspace._count.contacts} contacts ·{" "}
                {workspace._count.conversations} chats
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                await setWorkspaceLifecycle(
                  workspace.id,
                  workspace.lifecycle === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",
                );
              }}
            >
              <button type="submit" className="rounded-md border border-white/15 px-3 py-1.5 text-xs">
                {workspace.lifecycle === "SUSPENDED" ? "Restore" : "Suspend"}
              </button>
            </form>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg">Recent admin events</h2>
        <ul className="mt-3 space-y-2 text-sm text-white/65">
          {audits.map((event) => (
            <li key={event.id}>
              {event.action}
              {event.reason ? ` — ${event.reason}` : ""} ·{" "}
              {event.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
            </li>
          ))}
        </ul>
      </section>
    </AppPageShell>
  );
}
