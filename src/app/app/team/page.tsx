import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell, EmptyState } from "@/components/app/AppPageShell";
import { inviteTeammate } from "@/app/app/team/actions";

export default async function TeamPage() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  const workspaceId = membership?.workspaceId;
  const [members, pending, subscription] = workspaceId
    ? await Promise.all([
        prisma.membership.findMany({
          where: { workspaceId, inviteState: "ACCEPTED" },
          include: { user: true },
          orderBy: { createdAt: "asc" },
        }),
        prisma.membership.findMany({
          where: { workspaceId, inviteState: "PENDING" },
          include: { user: true },
          orderBy: { createdAt: "desc" },
        }),
        prisma.subscription.findUnique({ where: { workspaceId } }),
      ])
    : [[], [], null];

  return (
    <AppPageShell
      title="Team"
      description={
        subscription
          ? `${members.length + pending.length} of ${subscription.seats} seats used`
          : "People with access to this workspace"
      }
    >
      {membership?.role === "OWNER" ? (
        <form
          action={inviteTeammate}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-4"
        >
          <label className="text-sm">
            <span className="text-white/55">Email</span>
            <input
              name="email"
              type="email"
              required
              placeholder="agent@company.com"
              className="mt-1 block rounded-md border border-white/15 bg-transparent px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-white/55">Role</span>
            <select
              name="role"
              defaultValue="AGENT"
              className="mt-1 block rounded-md border border-white/15 bg-[#0B1210] px-3 py-2"
            >
              <option value="AGENT">Agent</option>
              <option value="MANAGER">Manager</option>
              <option value="ANALYST">Analyst</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
          >
            Create invite
          </button>
          <p className="w-full text-xs text-white/40">
            They need an account first. The invite link is /invite/ plus the token stored on the pending row.
          </p>
        </form>
      ) : null}

      {members.length === 0 ? (
        <EmptyState title="No teammates yet" body="Invite someone who already has an account." />
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-white/45">{m.user.email}</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-[#3DDC97]">{m.role}</span>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg">Pending invites</h2>
          <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
            {pending.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p className="text-sm">{m.user.email}</p>
                <p className="text-xs text-white/45">
                  {m.role}
                  {m.inviteToken ? ` · /invite/${m.inviteToken}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AppPageShell>
  );
}
