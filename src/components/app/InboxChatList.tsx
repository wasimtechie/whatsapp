"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, CheckCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxListItem = {
  id: string;
  name: string;
  phone: string;
  preview: string;
  previewOutbound: boolean;
  previewStatus: string | null;
  mediaType: string;
  time: string;
  state: string;
  unread: number;
};

function formatChatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function avatarColor(name: string) {
  const colors = [
    "#00a884",
    "#53bdeb",
    "#df3eb1",
    "#06cf9c",
    "#ffa97a",
    "#02a698",
    "#7f66ff",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function previewLabel(item: InboxListItem) {
  if (item.mediaType === "image") return "📷 Photo";
  if (item.mediaType === "video") return "🎬 Video";
  if (item.mediaType === "audio") return "🎤 Voice message";
  if (item.mediaType === "document") return "📄 Document";
  if (item.mediaType === "location") return "📍 Location";
  if (item.mediaType === "sticker") return "Sticker";
  if (item.mediaType === "template") return "📋 Template";
  return item.preview;
}

export function InboxChatList({ items }: { items: InboxListItem[] }) {
  const pathname = usePathname();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(query) ||
        i.phone.includes(query) ||
        i.preview.toLowerCase().includes(query),
    );
  }, [items, q]);

  return (
    <>
      <div className="bg-[#111b21] px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[#202c33] px-3 py-1.5">
          <Search className="size-4 text-[#8696a0]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search or start a new chat"
            className="w-full bg-transparent text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[#8696a0]">
            No chats found
          </p>
        ) : (
          filtered.map((item) => {
            const active = pathname === `/app/inbox/${item.id}`;
            const initial = item.name.slice(0, 1).toUpperCase();
            const href = `/app/inbox/${item.id}`;
            return (
              <Link
                key={item.id}
                href={href}
                className={cn(
                  "flex gap-3 border-b border-[#222d34] px-3 py-3 transition-colors",
                  active ? "bg-[#2a3942]" : "hover:bg-[#202c33]",
                )}
              >
                <div
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                  style={{ backgroundColor: avatarColor(item.name) }}
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-[15px]",
                        item.unread
                          ? "font-semibold text-[#e9edef]"
                          : "font-medium text-[#e9edef]",
                      )}
                    >
                      {item.name}
                    </p>
                    <span
                      className={cn(
                        "shrink-0 text-[11px]",
                        item.unread ? "text-[#00a884]" : "text-[#8696a0]",
                      )}
                    >
                      {formatChatTime(item.time)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="flex min-w-0 items-center gap-1 truncate text-[13px] text-[#8696a0]">
                      {item.previewOutbound && (
                        <StatusIcon status={item.previewStatus} />
                      )}
                      <span className="truncate">{previewLabel(item)}</span>
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {item.state === "PENDING" && (
                        <span className="rounded bg-[#8696a0]/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#8696a0]">
                          pending
                        </span>
                      )}
                      {item.unread > 0 && (
                        <span className="flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#00a884] px-1.5 text-[11px] font-semibold text-[#111b21]">
                          {item.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === "READ") {
    return <CheckCheck className="size-3.5 shrink-0 text-[#53bdeb]" />;
  }
  if (status === "DELIVERED" || status === "SENT") {
    return <CheckCheck className="size-3.5 shrink-0 text-[#8696a0]" />;
  }
  return <Check className="size-3.5 shrink-0 text-[#8696a0]" />;
}
