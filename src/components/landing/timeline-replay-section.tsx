import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

export function LandingTimelineReplaySection() {
  return (
    <LandingAnimatedCopySection
      kicker="Timeline"
      followsDiagram
      inViewAmount={0.28}
      lines={[
        {
          text: "Replay any decision.",
          accent: "any decision",
        },
        {
          text: "From first signal to final outcome.",
          accent: "final outcome",
        },
      ]}
    />
  );
}
