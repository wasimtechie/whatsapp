"use client";

import { FormEvent, useState, useTransition } from "react";
import { sendInboxReply } from "@/app/app/inbox/actions";

export function ReplyComposer({
  conversationId,
  withinServiceWindow,
}: {
  conversationId: string;
  withinServiceWindow: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const result = await sendInboxReply(conversationId, text);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setText("");
      setInfo(
        result.provider === "meta"
          ? "Sent via WhatsApp Cloud API"
          : "Sent (local demo — not delivered to Meta)",
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="border-t border-white/10 p-3">
      {!withinServiceWindow && (
        <p className="mb-2 text-xs text-amber-300/90">
          Outside the 24-hour customer service window. Free-form replies may be
          blocked on live Meta numbers — use an approved template in production.
          Demo mode still allows sending locally.
        </p>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a reply…"
          disabled={pending}
          className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#3DDC97] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8] disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      {info && <p className="mt-2 text-xs text-[#3DDC97]">{info}</p>}
    </form>
  );
}
