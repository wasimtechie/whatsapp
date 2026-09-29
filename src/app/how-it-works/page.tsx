import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

export const metadata: Metadata = {
  title: "How it works — beyond impossible",
  description:
    "Connect your WhatsApp number, automate with AI, and grow engagement into revenue.",
};

const steps = [
  {
    step: "01",
    title: "Connect",
    body: "Link your WhatsApp Business number via the official Cloud API, verify webhooks, and confirm with a test conversation.",
  },
  {
    step: "02",
    title: "Automate",
    body: "Turn on AI for greeting, qualification, and FAQs — with rules that always escalate to people when it matters.",
  },
  {
    step: "03",
    title: "Grow",
    body: "Run consent-aware campaigns, close in the shared inbox, and measure engagement through to revenue outcomes.",
  },
];

export default function HowItWorksRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B1210] text-[#F4F7F5]">
      <SiteHeader />
      <main className="flex-1 px-6 py-16 md:px-10 md:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-xs tracking-widest text-[#3DDC97]">
            HOW IT WORKS
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-tight md:text-5xl">
            From connect to revenue in three steps
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/70 md:text-lg">
            Official Meta Cloud API only — dependable delivery, clear consent,
            no session hacks.
          </p>

          <div className="mt-14 space-y-12">
            {steps.map((item) => (
              <div key={item.step}>
                <p className="font-mono text-xs tracking-widest text-[#3DDC97]">
                  {item.step}
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-2xl md:text-3xl">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/65 md:text-base">
                  {item.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14">
            <Link
              href="/signup"
              className="inline-flex rounded-md bg-[#3DDC97] px-6 py-3 text-sm font-semibold text-[#0B1210] hover:bg-[#5ae5a8] transition-colors"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
