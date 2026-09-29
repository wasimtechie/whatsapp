import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/ProductPage";

export const metadata: Metadata = {
  title: "Support — beyond impossible",
  description:
    "Delight customers and handle questions at scale with AI and a unified team inbox.",
};

export default function SupportRoute() {
  return (
    <ProductPage
      eyebrow="SUPPORT"
      title="Delight customers and resolve at scale"
      lead="Answer grounded questions around the clock, route complex chats to the right agent, and run support from a unified WhatsApp inbox with tags, history, and insights."
      points={[
        "Instant, accurate answers from your knowledge base — resolve most queries without human involvement.",
        "Route complex conversations to the right agent with clear handoff rules.",
        "Collaborate in a unified team inbox with tags, contact attributes, and history.",
        "Improve operations with data on response time, resolutions, and agent performance.",
      ]}
      stats={[
        { value: "40%", label: "Less workload" },
        { value: "80%", label: "FAQs resolved by AI" },
        { value: "40%", label: "Faster resolutions" },
      ]}
      ctaLabel="Test AI support"
    />
  );
}
