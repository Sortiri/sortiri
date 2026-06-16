import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

export function LandingEnterpriseSection() {
  return (
    <LandingAnimatedCopySection
      kicker="Enterprise"
      lines={[
        {
          text: "When every employee has agents,",
          accent: "every employee",
        },
        {
          text: "someone needs the black box.",
          accent: "black box",
        },
      ]}
    />
  );
}
