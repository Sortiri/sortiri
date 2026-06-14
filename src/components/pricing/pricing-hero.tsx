import Link from "next/link";
import { landing } from "@/components/landing/typography";
import { inter } from "@/lib/inter";

export function PricingHero() {
  return (
    <header className="pricing-hero">
      <h1 className={`${landing.display} pricing-hero__title`}>Pricing</h1>

      <p className={`${inter.className} pricing-hero__lead`}>
        Free Hobby tier, and paid upgrades to cover all needs. Separate usage
        costs.
      </p>

      <Link href="#usage-calculator" className="pricing-hero__calculator">
        Pricing estimate calculator
      </Link>
    </header>
  );
}
