import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { EmbeddedSignup } from "@/components/app/EmbeddedSignup";
import {
  beginMfa,
  confirmMfa,
  disableMfa,
  startCheckout,
} from "@/app/app/settings/account-actions";
import { totpUri } from "@/lib/totp";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const membership = user?.memberships[0];
  const [number, subscription] = membership
    ? await Promise.all([
        prisma.whatsAppAccount.findFirst({
          where: { workspaceId: membership.workspaceId },
        }),
        prisma.subscription.findUnique({
          where: { workspaceId: membership.workspaceId },
        }),
      ])
    : [null, null];
  const mfaUri =
    user?.mfaSecret && !user.mfaEnabled ? totpUri(user.email, user.mfaSecret) : null;
  const metaAppId = process.env.META_APP_ID ?? "";
  const metaConfigId = process.env.META_EMBEDDED_SIGNUP_CONFIG_ID ?? "";

  async function connectNumber(formData: FormData) {
    "use server";
    const current = await getCurrentUser();
    const ws = current?.memberships[0];
    if (!ws || (ws.role !== "OWNER" && ws.role !== "MANAGER")) {
      throw new Error("Forbidden");
    }

    const phoneNumberId = String(formData.get("phoneNumberId") ?? "").trim();
    const wabaId = String(formData.get("wabaId") ?? "").trim() || null;
    const displayPhone = String(formData.get("displayPhone") ?? "").trim() || null;
    const accessToken = String(formData.get("accessToken") ?? "").trim();
    const verifyToken =
      String(formData.get("webhookVerifyToken") ?? "").trim() ||
      `relay_${ws.workspaceId.slice(0, 8)}`;

    if (!phoneNumberId || !accessToken) {
      throw new Error("Phone number ID and access token are required");
    }

    const subscription = await prisma.subscription.findUnique({
      where: { workspaceId: ws.workspaceId },
    });
    const existingNumbers = await prisma.whatsAppAccount.count({
      where: { workspaceId: ws.workspaceId },
    });
    const already = await prisma.whatsAppAccount.findUnique({
      where: {
        workspaceId_phoneNumberId: {
          workspaceId: ws.workspaceId,
          phoneNumberId,
        },
      },
    });
    if (subscription && !already && existingNumbers >= subscription.numbersLimit) {
      throw new Error(
        `This plan includes ${subscription.numbersLimit} WhatsApp number.`,
      );
    }

    // Store token as credential ref placeholder — encrypt with KMS in production
    await prisma.whatsAppAccount.upsert({
      where: {
        workspaceId_phoneNumberId: {
          workspaceId: ws.workspaceId,
          phoneNumberId,
        },
      },
      create: {
        workspaceId: ws.workspaceId,
        phoneNumberId,
        wabaId,
        displayPhone,
        accessTokenEnc: accessToken,
        webhookVerifyToken: verifyToken,
        health: "CONNECTED",
        credentialRef: `workspace:${ws.workspaceId}:number:${phoneNumberId}`,
      },
      update: {
        wabaId,
        displayPhone,
        accessTokenEnc: accessToken,
        webhookVerifyToken: verifyToken,
        health: "CONNECTED",
      },
    });

    await prisma.auditLog.create({
      data: {
        workspaceId: ws.workspaceId,
        actorId: current!.id,
        action: "whatsapp.number.connect",
        reason: "Owner connected Cloud API credentials",
        meta: { phoneNumberId },
      },
    });

    revalidatePath("/app/settings");
    revalidatePath("/app");
  }

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-white/55">
          Pilot path: connect with your own Meta Cloud API credentials
        </p>
      </div>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          WhatsApp Cloud API
        </h2>
        {number && (
          <p className="mt-2 text-sm text-[#3DDC97]">
            Connected · {number.displayPhone ?? number.phoneNumberId} ·{" "}
            {number.health}
          </p>
        )}
        <form action={connectNumber} className="mt-4 space-y-3">
          <Field
            label="Phone number ID"
            name="phoneNumberId"
            defaultValue={number?.phoneNumberId}
            required
          />
          <Field label="WABA ID" name="wabaId" defaultValue={number?.wabaId ?? ""} />
          <Field
            label="Display phone"
            name="displayPhone"
            defaultValue={number?.displayPhone ?? ""}
            placeholder="+91…"
          />
          <Field
            label="Permanent access token"
            name="accessToken"
            type="password"
            required={!number}
          />
          <Field
            label="Webhook verify token"
            name="webhookVerifyToken"
            defaultValue={number?.webhookVerifyToken ?? ""}
          />
          <p className="text-xs text-white/45">
            Point Meta webhooks to{" "}
            <code className="text-[#3DDC97]">/api/webhooks/whatsapp</code> and
            use the verify token above.
          </p>
          <button
            type="submit"
            className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
          >
            {number ? "Update connection" : "Save connection"}
          </button>
        </form>
        {metaAppId && metaConfigId ? (
          <div className="mt-4 border-t border-white/10 pt-4">
            <EmbeddedSignup
              appId={metaAppId}
              configId={metaConfigId}
              version={process.env.META_API_VERSION ?? "v21.0"}
            />
          </div>
        ) : (
          <p className="mt-4 text-xs text-white/40">
            Embedded signup needs META_APP_ID and META_EMBEDDED_SIGNUP_CONFIG_ID.
          </p>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">Billing</h2>
        <p className="mt-2 text-sm text-white/65">
          Plan {subscription?.plan ?? "trial"} · {subscription?.status ?? "trialing"} ·{" "}
          {subscription?.seats ?? 3} seats · {subscription?.numbersLimit ?? 1} number
        </p>
        <p className="mt-1 text-xs text-white/40">
          SaaS subscription is separate from Meta message charges.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <form action={startCheckout}>
            <input type="hidden" name="plan" value="starter" />
            <button type="submit" className="rounded-md border border-white/15 px-4 py-2 text-sm">
              Starter
            </button>
          </form>
          <form action={startCheckout}>
            <input type="hidden" name="plan" value="growth" />
            <button type="submit" className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]">
              Growth
            </button>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.02] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Two-factor authentication
        </h2>
        {user?.mfaEnabled ? (
          <form action={disableMfa} className="mt-3 space-y-3">
            <p className="text-sm text-[#3DDC97]">Authenticator is on.</p>
            <input
              name="code"
              inputMode="numeric"
              placeholder="Current code"
              required
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
            />
            <button type="submit" className="rounded-md border border-white/15 px-4 py-2 text-sm">
              Turn off
            </button>
          </form>
        ) : mfaUri ? (
          <form action={confirmMfa} className="mt-3 space-y-3">
            <p className="text-sm text-white/65">
              Add this key to an authenticator app, then enter the 6-digit code.
            </p>
            <p className="break-all font-mono text-xs text-[#3DDC97]">{user?.mfaSecret}</p>
            <input
              name="code"
              inputMode="numeric"
              required
              placeholder="123456"
              className="w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
            />
            <button type="submit" className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]">
              Confirm
            </button>
          </form>
        ) : (
          <form action={beginMfa} className="mt-3">
            <button type="submit" className="rounded-md border border-white/15 px-4 py-2 text-sm">
              Set up authenticator
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-white/7">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 outline-none focus:border-[#3DDC97]"
      />
    </label>
  );
}
