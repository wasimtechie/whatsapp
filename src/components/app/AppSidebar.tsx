"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Megaphone,
  MessageSquarePlus,
  CalendarClock,
  Contact,
  BarChart3,
  Plug,
  Users,
  Bot,
  Sparkles,
  Hourglass,
  Settings,
  Inbox,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/app", label: "Home", icon: Home, exact: true },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/broadcasts", label: "Broadcasts", icon: Megaphone },
  { href: "/app/templates", label: "Templates", icon: MessageSquarePlus },
  {
    href: "/app/scheduled",
    label: "Scheduled Broadcasts",
    icon: CalendarClock,
  },
  { href: "/app/customers", label: "Customers", icon: Contact },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/integrations", label: "Integrations", icon: Plug },
  { href: "/app/team", label: "Team", icon: Users },
  { href: "/app/chatbots", label: "Chat bots", icon: Bot },
  { href: "/app/chatgpt", label: "Chat GPT", icon: Sparkles },
  { href: "/app/pending", label: "Pending requests", icon: Hourglass },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({
  workspaceName,
  onLogout,
  showAdmin = false,
}: {
  workspaceName: string;
  onLogout: () => Promise<void>;
  showAdmin?: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-white/10 px-3 py-6 md:flex md:flex-col">
      <Link
        href="/"
        className="px-3 font-[family-name:var(--font-display)] text-lg leading-tight text-[#3DDC97]"
      >
        beyond impossible
      </Link>
      <p className="mt-1 truncate px-3 text-xs text-white/45">{workspaceName}</p>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {(showAdmin
          ? [...nav, { href: "/app/admin", label: "Admin", icon: Shield }]
          : nav
        ).map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-[#3DDC97]/15 text-[#3DDC97]"
                  : "text-white/70 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <form action={onLogout} className="mt-4 px-1">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/45 hover:bg-white/5 hover:text-white"
        >
          Log out
        </button>
      </form>
    </aside>
  );
}

export function MobileAppNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-white/10 px-3 py-2 md:hidden">
      {nav.slice(0, 6).map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs",
              active
                ? "bg-[#3DDC97]/15 text-[#3DDC97]"
                : "bg-white/5 text-white/65",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
