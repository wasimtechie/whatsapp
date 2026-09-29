"use client";

import { useState } from "react";

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void;
      login: (
        cb: (response: { authResponse?: { code?: string } }) => void,
        opts: Record<string, unknown>,
      ) => void;
    };
    fbAsyncInit?: () => void;
  }
}

export function EmbeddedSignup({
  appId,
  configId,
  version,
}: {
  appId: string;
  configId: string;
  version: string;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function connect() {
    setBusy(true);
    setStatus(null);
    try {
      await loadSdk(appId, version);
      const session = await new Promise<{
        code: string;
        wabaId?: string;
        phoneNumberId?: string;
      }>((resolve, reject) => {
        const details: { wabaId?: string; phoneNumberId?: string } = {};
        const onMessage = (event: MessageEvent) => {
          if (typeof event.origin !== "string" || !event.origin.endsWith("facebook.com")) return;
          try {
            const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
            if (data?.type === "WA_EMBEDDED_SIGNUP" && data?.data) {
              details.wabaId = data.data.waba_id;
              details.phoneNumberId = data.data.phone_number_id;
            }
          } catch {
            /* ignore non-json messages */
          }
        };
        window.addEventListener("message", onMessage);
        window.FB?.login(
          (response) => {
            window.removeEventListener("message", onMessage);
            const code = response.authResponse?.code;
            if (!code) {
              reject(new Error("Meta signup was cancelled."));
              return;
            }
            resolve({ code, ...details });
          },
          {
            config_id: configId,
            response_type: "code",
            override_default_response_type: true,
            extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
          },
        );
      });

      const res = await fetch("/api/meta/embedded-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(session),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not finish signup.");
      setStatus("WhatsApp number connected.");
      window.location.reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={connect}
        disabled={busy}
        className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210] disabled:opacity-60"
      >
        {busy ? "Opening Meta…" : "Connect with Meta"}
      </button>
      {status ? <p className="text-sm text-white/70">{status}</p> : null}
    </div>
  );
}

function loadSdk(appId: string, version: string) {
  if (window.FB) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({ appId, cookie: true, xfbml: false, version });
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.onerror = () => reject(new Error("Could not load the Meta SDK."));
    document.body.appendChild(script);
  });
}
