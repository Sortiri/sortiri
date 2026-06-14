import Link from "next/link";
import { PricingCheckIcon } from "@/components/pricing/pricing-check-icon";
import type { PricingTier } from "@/config/pricing-plans";
import { landing } from "@/components/landing/typography";

type PricingTierCardProps = {
  tier: PricingTier;
};

export function PricingTierCard({ tier }: PricingTierCardProps) {
  const buttonClass =
    tier.ctaVariant === "secondary"
      ? landing.buttonSecondaryLg
      : tier.featured
        ? `${landing.buttonPrimary} pricing-tier__cta--on-light`
        : landing.buttonPrimary;

  return (
    <article
      className={`pricing-tier${tier.featured ? " pricing-tier--featured" : ""}`}
    >
      <div className="pricing-tier__head">
        <p className="pricing-tier__label">{tier.label}</p>
        <p className="pricing-tier__price">
          {tier.price}
          {tier.priceSuffix ? (
            <span className="pricing-tier__price-suffix">{tier.priceSuffix}</span>
          ) : null}
        </p>
        <p className="pricing-tier__usage">{tier.usageNote}</p>
      </div>

      <div className="pricing-tier__body">
        {tier.features ? (
          <ul className="pricing-tier__features">
            {tier.features.map((feature) => (
              <li key={feature} className="pricing-tier__feature">
                <PricingCheckIcon featured={tier.featured} />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="pricing-tier__description">{tier.description}</p>
        )}
      </div>

      <div className="pricing-tier__foot">
        <Link href={tier.ctaHref} className={`pricing-tier__cta ${buttonClass}`}>
          {tier.cta}
        </Link>
        <p className="pricing-tier__footnote">{tier.footnote}</p>
      </div>
    </article>
  );
}
