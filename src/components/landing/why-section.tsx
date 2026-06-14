import { LandingAnimatedCopySection } from "@/components/landing/animated-copy-section";

const WHY_LINES = [
  {
    text: "Sortiri turns every agent action, product event,",
    accent: "agent action",
  },
  { text: "and company decision into a searchable history." },
];

export function LandingWhySection() {
  return <LandingAnimatedCopySection kicker="Why Sortiri" lines={WHY_LINES} />;
}
