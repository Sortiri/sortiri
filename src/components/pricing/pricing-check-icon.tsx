type PricingCheckIconProps = {
  featured?: boolean;
};

export function PricingCheckIcon({ featured = false }: PricingCheckIconProps) {
  return (
    <svg
      className={`pricing-tier__check${featured ? " pricing-tier__check--featured" : ""}`}
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden
      focusable="false"
    >
      <path
        d="M2.5 7.25 5.5 10.25 11.5 3.75"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}
