import { PricingTierCard } from "@/components/pricing/pricing-tier-card";
import { PRICING_TIERS } from "@/config/pricing-plans";

export function PricingTiers() {
  return (
    <section className="pricing-tiers" aria-label="Pricing plans">
      {PRICING_TIERS.map((tier) => (
        <PricingTierCard key={tier.id} tier={tier} />
      ))}
    </section>
  );
}
