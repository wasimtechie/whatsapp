import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/ProductPage";

export const metadata: Metadata = {
  title: "AI — beyond impossible",
  description:
    "AI agents that qualify leads and deflect support queries so your team drives revenue.",
};

export default function AiRoute() {
  return (
    <ProductPage
      eyebrow="AI"
      title="Let AI handle the grind so your team builds relationships"
      lead="beyond impossible AI qualifies inbound leads, answers routine support questions, and steps aside the moment a human takes over — with full conversation context intact."
      points={[
        "Build inbound agents that uncover intent and close the loop on chat, fast.",
        "Train a support agent on your knowledge base in minutes and deflect routine queries.",
        "Always escalate with rules — automation pauses when your team owns the thread.",
        "Multilingual, contextual replies that stay on-brand and auditable.",
      ]}
      stats={[
        { value: "24/7", label: "Always-on coverage" },
        { value: "60%", label: "Queries answered instantly" },
        { value: "10×", label: "Team leverage goal" },
      ]}
      ctaLabel="Build with AI"
    />
  );
}
