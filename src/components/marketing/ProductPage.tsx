import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

type Stat = { value: string; label: string };

export function ProductPage({
  eyebrow,
  title,
  lead,
  points,
  stats,
  ctaLabel = "Try for free",
  ctaHref = "/signup",
}: {
  eyebrow: string;
  title: string;
  lead: string;
  points: string[];
  stats: Stat[];
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1210] text-[#F4F7F5]">
      <SiteHeader />
      <main className="flex-1 px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs tracking-widest text-[#3DDC97]">
            {eyebrow}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
            {lead}
          </p>

          <ul className="mt-10 space-y-4">
            {points.map((point) => (
              <li
                key={point}
                className="flex gap-3 text-sm leading-relaxed text-white/75 md:text-base"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#3DDC97]" />
                {point}
              </li>
            ))}
          </ul>

          <div className="mt-12 flex flex-wrap gap-10 border-t border-white/10 pt-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="font-[family-name:var(--font-display)] text-3xl text-[#3DDC97] md:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-white/50">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap gap-4">
            <Link
              href={ctaHref}
              className="inline-flex rounded-md bg-[#3DDC97] px-6 py-3 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8] transition-colors"
            >
              {ctaLabel}
            </Link>
            <Link
              href="/signup"
              className="inline-flex rounded-md border border-white/25 px-6 py-3 text-sm font-medium hover:border-white/50 transition-colors"
            >
              Book a demo
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
