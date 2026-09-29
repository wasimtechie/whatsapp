import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { BRAND, menuLinks } from "@/components/marketing/brand";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-white/10 bg-[#0B1210]/90 backdrop-blur-md">
      <div className="flex items-center justify-between gap-4 px-6 py-4 md:px-10">
        <Link
          href="/"
          className="shrink-0 font-[family-name:var(--font-display)] text-base tracking-tight text-[#F4F7F5] md:text-lg"
        >
          {BRAND}
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-sm text-white/90">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden hover:text-white transition-colors sm:inline"
            >
              {link.label}
            </Link>
          ))}
          {user ? (
            <>
              <span className="hidden max-w-[10rem] truncate text-white/50 md:inline">
                {user.name ?? user.email}
              </span>
              <Link
                href="/app"
                className="rounded-md bg-[#3DDC97] px-3.5 py-1.5 font-medium text-[#0B1210] hover:bg-[#5ae5a8] transition-colors"
              >
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-white transition-colors">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-[#3DDC97] px-3.5 py-1.5 font-medium text-[#0B1210] hover:bg-[#5ae5a8] transition-colors"
              >
                Try for free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export async function SiteFooter() {
  const user = await getCurrentUser();

  return (
    <footer className="border-t border-white/10 px-6 py-8 md:px-10">
      <div className="flex flex-col gap-4 text-sm text-white/45 md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-white/70"
        >
          {BRAND}
        </Link>
        <div className="flex flex-wrap gap-4">
          {menuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-[#F4F7F5]"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-4">
          {user ? (
            <Link href="/app" className="hover:text-[#F4F7F5]">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hover:text-[#F4F7F5]">
                Log in
              </Link>
              <Link href="/signup" className="hover:text-[#F4F7F5]">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}

export { BRAND, menuLinks };
