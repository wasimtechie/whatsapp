"use client";

import { FormEvent, useState } from "react";
import { AppPageShell } from "@/components/app/AppPageShell";

type Msg = { role: "user" | "assistant"; text: string };

export default function ChatGptPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      text: "Hi — draft replies, FAQs, or campaign copy here. This is a local demo (no API key required).",
    },
  ]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    const reply = craftReply(text);
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: reply },
    ]);
    setInput("");
  }

  return (
    <AppPageShell
      title="Chat GPT"
      description="Draft WhatsApp replies and campaign copy with AI assistance"
      action={{ href: "/app/chatbots", label: "Chat bots" }}
    >
      <div className="flex h-[28rem] flex-col rounded-lg border border-white/10 bg-white/[0.02]">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-auto bg-[#3DDC97] text-[#0B1210]"
                  : "bg-white/10 text-white/85"
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <form
          onSubmit={onSubmit}
          className="flex gap-2 border-t border-white/10 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask for a reply draft…"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#3DDC97]"
          />
          <button
            type="submit"
            className="rounded-md bg-[#3DDC97] px-4 py-2 text-sm font-semibold text-[#0B1210]"
          >
            Send
          </button>
        </form>
      </div>
    </AppPageShell>
  );
}

function craftReply(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes("refund")) {
    return "Suggested reply: “Sorry for the trouble — I’ve raised a refund for order {{order_id}}. You’ll see it in 3–5 business days. Anything else I can help with?”";
  }
  if (lower.includes("demo") || lower.includes("pricing")) {
    return "Suggested reply: “Happy to help! Our trial includes 3 seats and 1 WhatsApp number. Want a 15-min walkthrough tomorrow at 11am IST?”";
  }
  if (lower.includes("campaign") || lower.includes("broadcast")) {
    return "Suggested copy: “Hi {{name}}, your exclusive offer {{code}} is live till Sunday. Reply YES to get the catalogue.” Pair with an approved MARKETING template.";
  }
  return `Suggested reply: “Thanks for reaching out — ${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""} I’ll take care of this and update you shortly.”`;
}
