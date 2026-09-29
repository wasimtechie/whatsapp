"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import BlurText from "@/components/bits/BlurText";
import Magnet from "@/components/bits/Magnet";
import CountUp from "@/components/bits/CountUp";
import FadeContent from "@/components/bits/FadeContent";
import SpotlightCard from "@/components/bits/SpotlightCard";
import ShinyText from "@/components/bits/ShinyText";
import TiltCard from "@/components/bits/TiltCard";
import Marquee from "@/components/bits/Marquee";
import ScrollReveal from "@/components/bits/ScrollReveal";
import FloatingOrbs from "@/components/bits/FloatingOrbs";
import ChatPreview from "@/components/marketing/ChatPreview";
import { BRAND } from "@/components/marketing/brand";
import {
  Bot,
  Megaphone,
  MessageCircle,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

const Threads = dynamic(() => import("@/components/bits/Threads"), {
  ssr: false,
});

const pillars = [
  {
    href: "/marketing",
    label: "Marketing",
    icon: Megaphone,
    title: "Turn every touch into a conversation",
    body: "Launch consented WhatsApp campaigns, retarget from ads that open chat, and nurture leads with automation that still feels human.",
    stats: [
      { value: 85, suffix: "%", label: "Higher reply rates vs email" },
      { value: 3, suffix: "×", label: "Campaign ROI lift target" },
    ],
  },
  {
    href: "/sales",
    label: "Sales",
    icon: Zap,
    title: "Qualify faster. Close on chat.",
    body: "AI greets inbound interest, scores intent, and hands hot leads to your team with full context — so nothing dies in the queue.",
    stats: [
      { value: 30, suffix: "%", label: "Shorter sales cycle goal" },
      { value: 3, suffix: "×", label: "Faster first response" },
    ],
  },
  {
    href: "/support",
    label: "Support",
    icon: MessageCircle,
    title: "Resolve at scale without the backlog",
    body: "Grounded AI answers routine questions around the clock, then escalates edge cases to the right agent with history intact.",
    stats: [
      { value: 60, suffix: "%", label: "Queries auto-handled" },
      { value: 40, suffix: "%", label: "Less agent workload" },
    ],
  },
];

const capabilities = [
  "Shared inbox",
  "AI auto-replies",
  "Lead qualification",
  "Broadcast campaigns",
  "Template messages",
  "Smart handoffs",
  "Team routing",
  "Analytics",
  "Chatbots",
  "Knowledge base",
];

const steps = [
  {
    n: "01",
    title: "Connect your number",
    body: "Bring your Meta Cloud API credentials and go live on WhatsApp Business Platform.",
  },
  {
    n: "02",
    title: "Automate with AI",
    body: "Train agents on your FAQs and flows — greet, qualify, and resolve without waiting.",
  },
  {
    n: "03",
    title: "Grow engagement into revenue",
    body: "Campaigns, inbox, and analytics in one workspace built for Indian SMBs.",
  },
];

export default function LandingPage() {
  return (
    <div className="bg-[#0B1210] text-[#F4F7F5]">
      {/* Hero */}
      <section className="relative isolate flex min-h-[100svh] flex-col justify-center overflow-hidden px-6 pb-16 pt-28 md:px-10 md:pb-24">
        <div className="pointer-events-none absolute inset-0 bg-[#0B1210]">
          <Threads
            color={[0.24, 0.86, 0.59]}
            amplitude={1.35}
            distance={0.22}
            enableMouseInteraction
          />
          <FloatingOrbs />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B1210] via-[#0B1210]/50 to-[#0B1210]/15" />
        </div>

        <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <ScrollReveal>
              <p className="mb-4 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[#3DDC97] md:text-6xl lg:text-7xl">
                {BRAND}
              </p>
            </ScrollReveal>
            <BlurText
              as="h1"
              text="AI-powered WhatsApp automation for engagement and revenue."
              className="max-w-xl font-[family-name:var(--font-display)] text-3xl leading-tight tracking-tight text-[#F4F7F5] md:text-5xl"
              animateBy="words"
              delay={60}
              direction="bottom"
            />
            <ScrollReveal delay={0.25}>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-white/75 md:text-lg">
                From first outreach to closed deals and ongoing support —{" "}
                {BRAND} automates the busywork so your team can focus on
                conversations that grow the business.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Magnet padding={60} magnetStrength={3}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-md bg-[#3DDC97] px-6 py-3 text-sm font-semibold text-[#0B1210] shadow-[0_0_32px_rgba(61,220,151,0.35)] transition-colors hover:bg-[#5ae5a8]"
                  >
                    Try for free
                  </Link>
                </Magnet>
                <Magnet padding={60} magnetStrength={3}>
                  <Link
                    href="/signup"
                    className="inline-flex items-center rounded-md border border-white/25 px-6 py-3 text-sm font-medium text-[#F4F7F5] transition-colors hover:border-white/50"
                  >
                    Book a demo
                  </Link>
                </Magnet>
              </div>
            </ScrollReveal>
          </div>

          <ScrollReveal delay={0.2} className="hidden lg:block">
            <TiltCard maxTilt={6}>
              <ChatPreview />
            </TiltCard>
          </ScrollReveal>
        </div>
      </section>

      {/* Marquee */}
      <section className="border-y border-white/10 bg-[#0e1613] py-5">
        <Marquee
          speed={40}
          items={capabilities.map((c) => (
            <span key={c} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3DDC97]" />
              <span className="font-medium tracking-wide text-white/60">
                {c}
              </span>
            </span>
          ))}
        />
      </section>

      {/* Stats */}
      <section className="relative overflow-hidden px-6 py-20 md:px-10">
        <FloatingOrbs />
        <div className="relative z-10 mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              to: 24,
              suffix: "/7",
              label:
                "Always-on automation that greets, qualifies, and routes without waiting for business hours",
            },
            {
              to: 60,
              suffix: "%",
              label:
                "Routine questions answered instantly so agents stay on high-value chats",
            },
            {
              to: 20,
              suffix: "%",
              label:
                "Revenue growth goal for teams that close and retain on WhatsApp",
            },
          ].map((stat, i) => (
            <ScrollReveal key={stat.label} delay={i * 0.12}>
              <SpotlightCard className="h-full p-6 md:p-8">
                <p className="font-[family-name:var(--font-display)] text-4xl text-[#3DDC97] md:text-5xl">
                  <CountUp to={stat.to} suffix={stat.suffix} />
                </p>
                <p className="mt-3 text-sm leading-relaxed text-white/65">
                  {stat.label}
                </p>
              </SpotlightCard>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Product story */}
      <section className="border-t border-white/10 px-6 py-20 md:px-10">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <ScrollReveal>
            <p className="font-mono text-xs tracking-widest text-[#3DDC97]">
              PLATFORM
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
              WhatsApp at the center.{" "}
              <ShinyText>Growth across the journey.</ShinyText>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65 md:text-lg">
              {BRAND} is built on the official WhatsApp Business Platform —
              shared inbox, consent-aware campaigns, and AI that knows when to
              step back for a human. One workspace for marketing, sales, and
              support.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {[
                { icon: Bot, label: "AI agents" },
                { icon: Users, label: "Team inbox" },
                { icon: Sparkles, label: "Smart routing" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/70"
                >
                  <item.icon className="h-4 w-4 text-[#3DDC97]" />
                  {item.label}
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="lg:hidden">
            <ChatPreview />
          </ScrollReveal>

          <ScrollReveal delay={0.15} className="hidden lg:block">
            <div className="relative">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-[#3DDC97]/15 via-transparent to-transparent blur-2xl" />
              <TiltCard maxTilt={5}>
                <div className="relative space-y-3 rounded-2xl border border-white/10 bg-[#121a17]/90 p-6">
                  {[
                    {
                      title: "Inbound lead",
                      meta: "Qualified in 8s",
                      tone: "bg-[#3DDC97]/15 text-[#3DDC97]",
                    },
                    {
                      title: "Campaign reply",
                      meta: "Hot intent · sales",
                      tone: "bg-amber-400/15 text-amber-300",
                    },
                    {
                      title: "Support FAQ",
                      meta: "Auto-resolved",
                      tone: "bg-sky-400/15 text-sky-300",
                    },
                  ].map((row, i) => (
                    <ScrollReveal key={row.title} delay={i * 0.08} y={16}>
                      <div className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-white/90">
                            {row.title}
                          </p>
                          <p className="text-xs text-white/45">{row.meta}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${row.tone}`}
                        >
                          live
                        </span>
                      </div>
                    </ScrollReveal>
                  ))}
                </div>
              </TiltCard>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* AI */}
      <section className="relative overflow-hidden border-t border-white/10 px-6 py-20 md:px-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(61,220,151,0.08),transparent_55%)]" />
        <FadeContent className="relative z-10 mx-auto max-w-3xl text-center">
          <p className="font-mono text-xs tracking-widest text-[#3DDC97]">AI</p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-5xl">
            Automate the grind.{" "}
            <span className="text-white/90">Keep the relationship human.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/65">
            Agents qualify inbound leads, deflect FAQs from your knowledge base,
            and pause the moment your team takes over — with the thread context
            intact.
          </p>
          <Magnet padding={70} magnetStrength={2.5} wrapperClassName="mt-8">
            <Link
              href="/ai"
              className="inline-flex rounded-md border border-[#3DDC97]/40 bg-[#3DDC97]/10 px-6 py-3 text-sm font-medium text-[#3DDC97] transition-colors hover:bg-[#3DDC97]/20"
            >
              Explore AI →
            </Link>
          </Magnet>
        </FadeContent>
      </section>

      {/* Pillars */}
      <section className="border-t border-white/10 px-6 py-20 md:px-10">
        <ScrollReveal className="mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            Fuel every stage of the buyer journey
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            One AI-assisted platform for acquisition, conversion, and retention
            on WhatsApp.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 lg:grid-cols-3">
          {pillars.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <ScrollReveal key={pillar.href} delay={i * 0.1}>
                <SpotlightCard className="flex h-full flex-col p-6 md:p-7">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#3DDC97]/12 text-[#3DDC97]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="font-mono text-[10px] tracking-widest text-[#3DDC97]">
                    {pillar.label.toUpperCase()}
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-xl md:text-2xl">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-white/65">
                    {pillar.body}
                  </p>
                  <div className="mt-6 flex gap-6">
                    {pillar.stats.map((s) => (
                      <div key={s.label}>
                        <p className="font-[family-name:var(--font-display)] text-2xl text-[#3DDC97]">
                          <CountUp to={s.value} suffix={s.suffix} />
                        </p>
                        <p className="mt-1 text-[11px] text-white/45">
                          {s.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href={pillar.href}
                    className="mt-6 inline-flex text-sm font-medium text-[#3DDC97] transition-colors hover:text-[#5ae5a8]"
                  >
                    Learn more →
                  </Link>
                </SpotlightCard>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-white/10 px-6 py-20 md:px-10">
        <ScrollReveal className="mx-auto max-w-5xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            How teams run {BRAND}
          </h2>
          <p className="mt-3 max-w-xl text-white/65">
            Connect your number, automate with AI, grow engagement into revenue
            — on the official Cloud API.
          </p>
        </ScrollReveal>

        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {steps.map((step, i) => (
            <ScrollReveal key={step.n} delay={i * 0.12}>
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-6 transition-colors hover:border-[#3DDC97]/30">
                <span className="font-[family-name:var(--font-display)] text-5xl text-[#3DDC97]/20 transition-colors group-hover:text-[#3DDC97]/40">
                  {step.n}
                </span>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  {step.body}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={0.2} className="mx-auto mt-8 max-w-5xl">
          <Link
            href="/how-it-works"
            className="inline-flex text-sm font-medium text-[#3DDC97] hover:underline"
          >
            See how it works →
          </Link>
        </ScrollReveal>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-white/10 px-6 py-28 md:px-10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3DDC97]/12 blur-[120px]" />
        </div>
        <FadeContent className="relative z-10 mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-5xl">
            Grow engagement. <ShinyText speed={2.5}>Grow revenue.</ShinyText>
          </h2>
          <p className="mt-4 text-white/65">
            Start a free workspace and put AI-assisted WhatsApp automation to
            work for your marketing, sales, and support teams.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Magnet padding={80} magnetStrength={2.5}>
              <Link
                href="/signup"
                className="inline-flex rounded-md bg-[#3DDC97] px-8 py-3.5 text-sm font-semibold text-[#0B1210] shadow-[0_0_40px_rgba(61,220,151,0.4)] transition-colors hover:bg-[#5ae5a8]"
              >
                Try for free
              </Link>
            </Magnet>
            <Magnet padding={80} magnetStrength={2.5}>
              <Link
                href="/signup"
                className="inline-flex rounded-md border border-white/25 px-8 py-3.5 text-sm font-medium text-[#F4F7F5] transition-colors hover:border-white/50"
              >
                Book a demo
              </Link>
            </Magnet>
          </div>
        </FadeContent>
      </section>
    </div>
  );
}
