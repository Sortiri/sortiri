import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

export function LandingAuditsSection() {
  return (
    <LandingAnimatedCopySection
      kicker="Audits"
      lines={[
        { text: "Find what everyone else misses." },
        { text: "Prove it with evidence.", accent: "evidence" },
      ]}
    />
  );
}
