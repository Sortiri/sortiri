import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";
import { LandingEmptySection } from "@/components/landing/empty-section";
import { LandingSectionSeparator } from "@/components/landing/section-separator";

export function LandingCapabilitiesSection() {
  return (
    <div className="flex flex-col">
      <LandingEmptySection />
      <LandingSectionSeparator />
      <LandingAnimatedCopySection
        kicker="Audits"
        lines={[
          {
            text: "Find what everyone else misses.",
            accent: "everyone else misses",
          },
        ]}
        className="pb-10 sm:pb-12"
      />
      <LandingSectionSeparator />
      <LandingEmptySection />
      <LandingSectionSeparator />
      <LandingAnimatedCopySection
        kicker="Timeline"
        lines={[{ text: "Replay any decision." }]}
        className="pt-0"
        inViewAmount={0.28}
      />
    </div>
  );
}
