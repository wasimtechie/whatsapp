import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";
import { AutomationBoard } from "@/components/app/AutomationBoard";

export default async function ChatbotsPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const rules = workspaceId
    ? await prisma.automationRule.findMany({
        where: { workspaceId },
        orderBy: { priority: "asc" },
      })
    : [];

  return (
    <AppPageShell
      title="Chat bots"
      description="Keyword, welcome, and after-hours replies. An assigned agent stops the bot. STOP always unsubscribes the contact."
    >
      <AutomationBoard
        rules={rules.map((rule) => ({
          id: rule.id,
          name: rule.name,
          priority: rule.priority,
          enabled: rule.enabled,
          testMode: rule.testMode,
          trigger: rule.trigger,
          actions: rule.actions,
        }))}
      />
      <p className="text-sm text-white/45">
        Handoffs land in{" "}
        <Link href="/app/pending" className="text-[#3DDC97] hover:underline">
          Pending requests
        </Link>
        . Rules run when Meta delivers an inbound webhook.
      </p>
    </AppPageShell>
  );
}
