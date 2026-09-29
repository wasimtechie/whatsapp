import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";
import {
  cancelBroadcast,
  launchBroadcast,
} from "@/app/app/broadcasts/actions";

export default async function BroadcastDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const campaign = workspaceId
    ? await prisma.campaign.findFirst({
        where: { id: campaignId, workspaceId },
        include: {
          template: true,
          recipients: {
            include: { contact: true },
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!campaign) notFound();

  const counts = campaign.recipients.reduce(
    (acc, recipient) => {
      acc[recipient.status] = (acc[recipient.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const canSend =
    campaign.status === "DRAFT" ||
    campaign.status === "SCHEDULED" ||
    campaign.status === "PAUSED";
  const demo = campaign.numberId
    ? await prisma.whatsAppAccount.findFirst({
        where: { id: campaign.numberId },
        select: { phoneNumberId: true, accessTokenEnc: true },
      })
    : null;
  const localOnly =
    !demo?.accessTokenEnc ||
    demo.accessTokenEnc.startsWith("demo-") ||
    demo.phoneNumberId.startsWith("demo_");

  return (
    <AppPageShell
      title={campaign.name}
      description={`${campaign.template.name} · ${campaign.template.language} · ${campaign.status}`}
      action={{ href: "/app/broadcasts", label: "All broadcasts" }}
    >
      <div className="grid gap-3 sm:grid-cols-4">
        {(
          [
            ["Eligible", counts.QUEUED ?? 0],
            ["Accepted", counts.ACCEPTED ?? 0],
            ["Suppressed", (counts.SUPPRESSED ?? 0) + (counts.OPTED_OUT ?? 0)],
            ["Failed", counts.FAILED ?? 0],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-white/[0.02] p-4"
          >
            <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[#3DDC97]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <p className="text-sm text-white/55">
        Estimated Meta charge ₹
        {campaign.estimatedCost != null
          ? Number(campaign.estimatedCost).toLocaleString("en-IN")
          : "0"}
        . This is not your SaaS invoice.
        {campaign.scheduledAt
          ? ` Scheduled ${campaign.scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.`
          : ""}
        {localOnly
          ? " This number is still a demo connection, so sends stay in the inbox until you add a Cloud API token."
          : ""}
      </p>

      {canSend ? (
        <div className="flex flex-wrap gap-3">
          <form action={launchBroadcast}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              type="submit"
              className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
            >
              Send eligible contacts
            </button>
          </form>
          <form action={cancelBroadcast}>
            <input type="hidden" name="campaignId" value={campaign.id} />
            <button
              type="submit"
              className="rounded-md border border-white/15 px-4 py-2 text-sm text-white/70"
            >
              Cancel
            </button>
          </form>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/10 text-xs uppercase text-white/45">
            <tr>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {campaign.recipients.map((recipient) => (
              <tr key={recipient.id} className="border-b border-white/5">
                <td className="px-4 py-3">
                  {recipient.contact.profileName ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {recipient.contact.phoneE164}
                </td>
                <td className="px-4 py-3 text-[#3DDC97]">{recipient.status}</td>
                <td className="px-4 py-3 text-white/45">
                  {recipient.failureReason ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link href="/app/broadcasts/new" className="text-sm text-[#3DDC97] hover:underline">
        Create another broadcast
      </Link>
    </AppPageShell>
  );
}
