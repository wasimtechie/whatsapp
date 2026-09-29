import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppPageShell } from "@/components/app/AppPageShell";
import {
  createApiKey,
  disableOutboundWebhook,
  revokeApiKey,
  saveOutboundWebhook,
} from "@/app/app/integrations/actions";
import { NewApiKey } from "@/components/app/NewApiKey";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const workspaceId = user?.memberships[0]?.workspaceId;
  const [keys, hooks] = workspaceId
    ? await Promise.all([
        prisma.apiKey.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.outboundWebhook.findMany({
          where: { workspaceId },
          include: { deliveries: { orderBy: { createdAt: "desc" }, take: 3 } },
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], []];

  return (
    <AppPageShell
      title="Integrations"
      description="API keys and signed outbound webhooks for this workspace"
    >
      <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">API keys</h2>
        <p className="text-sm text-white/55">
          Send <code className="text-[#3DDC97]">Authorization: Bearer bi_…</code> to{" "}
          <code className="text-[#3DDC97]">/api/v1/contacts</code> and{" "}
          <code className="text-[#3DDC97]">/api/v1/conversations</code>. The full key is shown once.
        </p>
        <NewApiKey action={createApiKey} />
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <p className="text-sm">{key.name}</p>
                <p className="font-mono text-xs text-white/45">
                  {key.prefix}… {key.revokedAt ? "· revoked" : ""}
                </p>
              </div>
              {!key.revokedAt ? (
                <form action={revokeApiKey}>
                  <input type="hidden" name="id" value={key.id} />
                  <button type="submit" className="text-xs text-white/50 hover:text-red-300">
                    Revoke
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Outbound webhooks</h2>
        <p className="text-sm text-white/55">
          Each delivery includes <code className="text-[#3DDC97]">X-Relay-Signature: sha256=…</code> over the raw body.
        </p>
        <form action={saveOutboundWebhook} className="space-y-3">
          <input
            name="url"
            type="url"
            required
            placeholder="https://example.com/hooks/whatsapp"
            className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="events" value="message.inbound" defaultChecked />
            message.inbound
          </label>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" name="events" value="campaign.completed" defaultChecked />
            campaign.completed
          </label>
          <button type="submit" className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]">
            Add webhook
          </button>
        </form>
        <ul className="space-y-3">
          {hooks.map((hook) => (
            <li key={hook.id} className="rounded-lg border border-white/10 px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="break-all text-sm">{hook.url}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {hook.enabled ? "On" : "Off"} · {hook.events.join(", ")}
                  </p>
                  <p className="mt-1 font-mono text-xs text-white/40">secret {hook.secret}</p>
                </div>
                {hook.enabled ? (
                  <form action={disableOutboundWebhook}>
                    <input type="hidden" name="id" value={hook.id} />
                    <button type="submit" className="text-xs text-white/50">
                      Disable
                    </button>
                  </form>
                ) : null}
              </div>
              {hook.deliveries.length > 0 ? (
                <ul className="mt-2 text-xs text-white/45">
                  {hook.deliveries.map((delivery) => (
                    <li key={delivery.id}>
                      {delivery.event} · {delivery.ok ? "ok" : delivery.error ?? "failed"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </AppPageShell>
  );
}
