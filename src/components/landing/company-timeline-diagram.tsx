import {
  LandingTerminalDiagram,
  type TerminalDiagramCard,
} from "@/components/landing/landing-terminal-diagram";

const CARDS: TerminalDiagramCard[] = [
  {
    id: "sources",
    title: "SOURCES",
    rows: [
      "Cursor / Codex",
      "GitHub",
      "PostHog",
      "Stripe",
      "Slack / Decisions",
    ],
  },
  {
    id: "timeline",
    title: "SORTIRI TIMELINE",
    rows: [
      "[10:42] agent changed onboarding",
      "[10:51] PR merged",
      "[11:08] users activated",
      "[11:32] payment succeeded",
      "[11:45] decision recorded",
    ],
  },
  {
    id: "outputs",
    title: "OUTPUTS",
    rows: [
      "Replay work",
      "Analyze impact",
      "Extract lessons",
      "Feed agent context",
      "Audit evidence",
    ],
  },
];

export function CompanyTimelineDiagram({ className = "" }: { className?: string }) {
  return (
    <LandingTerminalDiagram
      cards={CARDS}
      idPrefix="timeline-diagram"
      ariaLabel="Sortiri connects sources like Cursor, GitHub, and PostHog into a unified timeline that powers replay, impact analysis, lessons, agent context, and audit evidence."
      className={className}
    />
  );
}
