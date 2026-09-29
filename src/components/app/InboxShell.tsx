"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { InboxChatList, type InboxListItem } from "@/components/app/InboxChatList";
import { cn } from "@/lib/utils";

export function InboxShell({
  userInitial,
  items,
  children,
}: {
  userInitial: string;
  items: InboxListItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const inThread = pathname.startsWith("/app/inbox/") && pathname !== "/app/inbox";

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-3.5rem)] min-h-[28rem] overflow-hidden border-t border-[#222d34] bg-[#111b21] md:-mx-8 md:h-[calc(100vh-3.25rem)]">
      <aside
        className={cn(
          "flex w-full flex-col border-r border-[#222d34] bg-[#111b21] md:w-[380px] md:max-w-[380px]",
          inThread ? "hidden md:flex" : "flex",
        )}
      >
        <div className="flex items-center justify-between bg-[#202c33] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-[#6a7175] text-sm font-semibold text-white">
              {userInitial}
            </div>
            <div>
              <p className="text-sm font-medium text-[#e9edef]">Chats</p>
              <p className="text-[11px] text-[#8696a0]">
                {items.length} conversation{items.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <Link
            href="/app"
            className="rounded-full px-2 py-1 text-[11px] text-[#00a884] hover:bg-white/5"
          >
            Home
          </Link>
        </div>
        <InboxChatList items={items} />
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1 flex-col bg-[#0b141a]",
          inThread ? "flex" : "hidden md:flex",
        )}
      >
        {children}
      </section>
    </div>
  );
}
