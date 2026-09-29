import type { Metadata } from "next";
import { ProductPage } from "@/components/marketing/ProductPage";

export const metadata: Metadata = {
  title: "Marketing — beyond impossible",
  description:
    "Acquire, engage, and qualify leads with personalized WhatsApp campaigns at scale.",
};

export default function MarketingRoute() {
  return (
    <ProductPage
      eyebrow="MARKETING"
      title="Acquire, engage, and qualify leads with campaigns that open chat"
      lead="Turn links, ads, and offline moments into WhatsApp conversations. beyond impossible helps you run consented outreach, improve attribution, and drive post-conversion workflows with AI that still feels human."
      points={[
        "Convert every touchpoint — from links to offline interactions and click-to-WhatsApp ads — into meaningful conversations.",
        "Improve attribution and retargeting with Meta and Google ads that open WhatsApp.",
        "Engage users after conversion with AI-assisted, human-like follow-ups.",
        "Stay on top of messaging, campaign, and ad performance with clear insights.",
      ]}
      stats={[
        { value: "4×", label: "Lower CAC target" },
        { value: "3×", label: "More ROI target" },
        { value: "85%", label: "Higher response rate" },
      ]}
      ctaLabel="See it in action"
    />
  );
}
