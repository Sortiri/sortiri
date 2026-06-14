import { LandingHeader } from "@/components/landing/header";
import { LandingPageShell } from "@/components/landing/page-shell";
import { LandingSectionSeparator } from "@/components/landing/section-separator";
import { LandingSiteFooter } from "@/components/landing/site-footer";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { PricingTiers } from "@/components/pricing/pricing-tiers";
import { UsageCostCalculator } from "@/components/pricing/usage-cost-calculator";
import type { Metadata } from "next";
import "../landing.css";
import "./pricing.css";

export const metadata: Metadata = {
  title: "Pricing — Sortiri Timeline",
  description:
    "Free Hobby tier and paid upgrades for AI-native teams. Separate usage costs.",
};

export default function PricingPage() {
  return (
    <div className="landing landing-page pricing-page min-h-dvh bg-black text-white">
      <LandingPageShell>
        <LandingHeader />

        <main className="flex min-w-0 flex-1 flex-col overflow-x-clip px-6 pb-12 sm:px-8">
          <PricingHero />
          <PricingTiers />

          <LandingSectionSeparator />

          <UsageCostCalculator />

          <LandingSiteFooter />
        </main>
      </LandingPageShell>
    </div>
  );
}
