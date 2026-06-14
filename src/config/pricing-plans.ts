export type PricingTierId = "hobby" | "pro" | "ultimate";

export type PricingTier = {
  id: PricingTierId;
  label: string;
  price: string;
  priceSuffix?: string;
  usageNote: string;
  features?: string[];
  description?: string;
  cta: string;
  ctaHref: string;
  ctaVariant: "primary" | "secondary";
  footnote: string;
  featured?: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "hobby",
    label: "Hobby",
    price: "Free",
    usageNote: "+ usage costs",
    features: [
      "One-time $100 of usage in credits",
      "Community support",
      "Up to 1-hour sandbox session length",
      "Up to 20 concurrently running sandboxes",
    ],
    cta: "Start for free",
    ctaHref: "/sign-up",
    ctaVariant: "primary",
    footnote: "No CC required",
  },
  {
    id: "pro",
    label: "Pro",
    price: "$150",
    priceSuffix: "/mo",
    usageNote: "+ usage costs",
    featured: true,
    features: [
      "Everything in the Hobby tier",
      "Customize your Sandbox CPU & RAM",
      "Up to 24-hour sandbox session length",
      "Up to 100 concurrently running sandboxes",
      "Ability to purchase extra concurrency up to 1,100",
    ],
    cta: "Choose Pro",
    ctaHref: "/sign-up",
    ctaVariant: "primary",
    footnote: "Payment by Stripe",
  },
  {
    id: "ultimate",
    label: "Ultimate",
    price: "Enterprise",
    usageNote: "+ usage costs",
    description: "Contact us for custom solution with special pricing.",
    cta: "Contact us",
    ctaHref: "#",
    ctaVariant: "secondary",
    footnote: "Custom pricing",
  },
];
