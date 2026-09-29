import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/ProductPage";

export const metadata: Metadata = {
  title: "Sales — beyond impossible",
  description:
    "Accelerate pipeline, increase conversions, and shorten sales cycles on WhatsApp.",
};

export default function SalesRoute() {
  return (
    <ProductPage
      eyebrow="SALES"
      title="Accelerate pipeline and close on chat"
      lead="One workspace for your reps to collaborate, qualify, and convert. AI greets inbound interest, scores intent, and hands sales-ready leads to people with full context."
      points={[
        "A single workspace for sales reps to collaborate, communicate, and convert leads.",
        "Real-time qualification so sales-ready leads never slip through the cracks.",
        "Handle high lead volume on WhatsApp — AI qualifies and hands off the best-fit chats automatically.",
        "Monitor chats and protect reputation with clear ownership and quality visibility.",
      ]}
      stats={[
        { value: "30%", label: "Shorter sales cycle goal" },
        { value: "3×", label: "Faster responses" },
        { value: "20%", label: "Revenue growth goal" },
      ]}
      ctaLabel="Chat with a rep"
    />
  );
}
