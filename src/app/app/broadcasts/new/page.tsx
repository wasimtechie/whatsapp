import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";
import { BroadcastComposer } from "@/components/app/BroadcastComposer";
import { placeholderIndexes, templateBody } from "@/lib/campaigns";

export default async function NewBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const { templateId } = await searchParams;
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const [templates, contacts] = workspaceId
    ? await Promise.all([
        prisma.template.findMany({
          where: { workspaceId, status: "APPROVED" },
          orderBy: { name: "asc" },
        }),
        prisma.contact.findMany({
          where: { workspaceId },
          select: { tags: true },
        }),
      ])
    : [[], []];

  const tags = [...new Set(contacts.flatMap((c) => c.tags))].sort();

  return (
    <AppPageShell
      title="New broadcast"
      description="Approved templates only. Consent and opt-outs are checked again at send time."
    >
      <div className="max-w-xl rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <BroadcastComposer
          initialTemplateId={templateId}
          tags={tags}
          templates={templates.map((template) => {
            const body = templateBody(template.components);
            return {
              id: template.id,
              name: template.name,
              language: template.language,
              category: template.category,
              body,
              placeholders: placeholderIndexes(body),
            };
          })}
        />
      </div>
    </AppPageShell>
  );
}
