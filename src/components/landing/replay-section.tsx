import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

export function LandingReplaySection() {
  return (
    <LandingAnimatedCopySection
      kicker="Replay"
      lines={[
        { text: "Ask your company what happened.", accent: "what happened" },
      ]}
    />
  );
}
