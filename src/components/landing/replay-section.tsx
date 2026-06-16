import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

export function LandingReplaySection() {
  return (
    <LandingAnimatedCopySection
      kicker="Replay"
      lines={[
        { text: "Ask your company what happened." },
        { text: "Get the replay, not the guess.", accent: "replay" },
      ]}
    />
  );
}
