"use client";

import { useState, useTransition, type FormEvent } from "react";
import {
  createAutomation,
  deleteAutomation,
  seedStarterAutomations,
  toggleAutomation,
} from "@/app/app/chatbots/actions";
import { parseActions, parseTrigger, type RuleTrigger } from "@/lib/automation";

export type AutomationRow = {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  testMode: boolean;
  trigger: unknown;
  actions: unknown;
};

export function AutomationBoard({ rules }: { rules: AutomationRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<RuleTrigger["type"]>("keyword");
  const [keywords, setKeywords] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("19:00");
  const [reply, setReply] = useState("");
  const [handoff, setHandoff] = useState(false);
  const [testMode, setTestMode] = useState(false);

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
    });
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    let trigger: RuleTrigger;
    if (kind === "welcome") trigger = { type: "welcome" };
    else if (kind === "outside_hours") {
      trigger = { type: "outside_hours", start, end };
    } else {
      const list = keywords
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      if (!list.length) {
        setError("Add at least one keyword.");
        return;
      }
      trigger = { type: "keyword", keywords: list };
    }

    run(async () => {
      const result = await createAutomation({
        name,
        trigger,
        reply,
        handoff,
        testMode,
      });
      if (result.ok) {
        setName("");
        setKeywords("");
        setReply("");
        setHandoff(false);
        setTestMode(false);
      }
      return result;
    });
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {rules.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/15 px-6 py-10 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl">
            No automations yet
          </p>
          <p className="mt-2 text-sm text-white/55">
            Starter rules cover a welcome, a pricing handoff, and an after-hours reply.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => seedStarterAutomations())}
            className="mt-4 rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
          >
            Add starter automations
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-white/10 rounded-lg border border-white/10">
          {rules.map((rule) => {
            const trigger = parseTrigger(rule.trigger);
            const actions = parseActions(rule.actions);
            const reply = actions.find((a) => a.type === "reply");
            return (
              <li
                key={rule.id}
                className="flex flex-wrap items-start justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {describeTrigger(trigger)} · priority {rule.priority}
                    {actions.some((a) => a.type === "handoff")
                      ? " · hands off to a person"
                      : ""}
                    {rule.testMode ? " · test mode" : ""}
                  </p>
                  {reply && reply.type === "reply" ? (
                    <p className="mt-2 max-w-xl text-sm text-white/70">
                      {reply.body}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        toggleAutomation(rule.id, "testMode", !rule.testMode),
                      )
                    }
                    className="rounded-md border border-white/15 px-3 py-1 text-xs text-white/70"
                  >
                    {rule.testMode ? "Test on" : "Test off"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      run(() => toggleAutomation(rule.id, "enabled", !rule.enabled))
                    }
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      rule.enabled
                        ? "bg-[#3DDC97]/20 text-[#3DDC97]"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {rule.enabled ? "On" : "Off"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => deleteAutomation(rule.id))}
                    className="rounded-md px-3 py-1 text-xs text-white/45 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <form
        onSubmit={onCreate}
        className="space-y-4 rounded-lg border border-white/10 bg-white/[0.02] p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          New automation
        </h2>
        <label className="block text-sm">
          <span className="text-white/55">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
            placeholder="Order status"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/55">When</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as RuleTrigger["type"])}
            className="mt-1 w-full rounded-md border border-white/15 bg-[#0B1210] px-3 py-2"
          >
            <option value="keyword">Customer message contains a keyword</option>
            <option value="welcome">First message from a new chat</option>
            <option value="outside_hours">Outside business hours</option>
          </select>
        </label>
        {kind === "keyword" ? (
          <label className="block text-sm">
            <span className="text-white/55">Keywords, comma separated</span>
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
              placeholder="order, tracking, status"
            />
          </label>
        ) : null}
        {kind === "outside_hours" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="text-white/55">Open</span>
              <input
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
                placeholder="09:00"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">Close</span>
              <input
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
                placeholder="19:00"
              />
            </label>
          </div>
        ) : null}
        <label className="block text-sm">
          <span className="text-white/55">Reply</span>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            required
            className="mt-1 w-full rounded-md border border-white/15 bg-transparent px-3 py-2"
            placeholder="Thanks, we received your message."
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={handoff}
            onChange={(e) => setHandoff(e.target.checked)}
          />
          Hand off to a person (moves the chat to Pending)
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => setTestMode(e.target.checked)}
          />
          Test mode (match only, do not send)
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210] disabled:opacity-60"
        >
          Save automation
        </button>
      </form>
    </div>
  );
}

function describeTrigger(trigger: RuleTrigger | null) {
  if (!trigger) return "Unknown trigger";
  if (trigger.type === "welcome") return "First message in a new chat";
  if (trigger.type === "keyword") return `Keywords: ${trigger.keywords.join(", ")}`;
  return `Outside ${trigger.start}–${trigger.end}`;
}
