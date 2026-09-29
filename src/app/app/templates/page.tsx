import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell, EmptyState } from "@/components/app/AppPageShell";
import { syncTemplates } from "@/app/app/templates/actions";

export default async function TemplatesPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const templates = workspaceId
    ? await prisma.template.findMany({
        where: { workspaceId },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return (
    <AppPageShell
      title="Templates"
      description="Approved WhatsApp message templates synced from Meta"
      action={{ href: "/app/broadcasts/new", label: "Create broadcast" }}
    >
      <form action={syncTemplates}>
        <button
          type="submit"
          className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/80"
        >
          Sync from Meta
        </button>
      </form>
      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          body="Seed data or sync templates from your WABA."
          href="/app/settings"
          cta="Check connection →"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {t.language} · {t.category ?? "UNCATEGORIZED"}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-[#3DDC97]">
                  {t.status}
                </span>
              </div>
              <Link
                href={
                  t.status === "APPROVED"
                    ? `/app/broadcasts/new?templateId=${t.id}`
                    : "/app/broadcasts"
                }
                className="mt-4 inline-flex text-sm text-[#3DDC97] hover:underline"
              >
                Use in broadcast →
              </Link>
            </div>
          ))}
        </div>
      )}
    </AppPageShell>
  );
}
