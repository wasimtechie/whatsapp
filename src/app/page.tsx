import LandingPage from "@/components/marketing/LandingPage";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B1210]">
      <div className="absolute inset-x-0 top-0 z-20">
        <SiteHeader />
      </div>
      <LandingPage />
      <SiteFooter />
    </div>
  );
}
