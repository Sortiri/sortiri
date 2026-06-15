import {
  LandingTerminalDiagram,
  type TerminalDiagramCard,
} from "@/components/landing/landing-terminal-diagram";

const CARDS: TerminalDiagramCard[] = [
  {
    id: "ask",
    title: "ASK",
    rows: [
      '"What changed in onboarding?"',
      '"Who merged the payment fix?"',
      '"Why did activation drop?"',
      '"What shipped last Tuesday?"',
      '"Show deploy impact"',
    ],
  },
  {
    id: "replay",
    title: "SORTIRI REPLAY",
    rows: [
      "searching timeline...",
      "[10:42] agent changed onboarding",
      "[10:51] PR merged",
      "[11:08] users activated",
      "4 events matched",
    ],
  },
  {
    id: "answer",
    title: "ANSWER",
    rows: [
      "Replay ready",
      "3 linked events",
      "1 decision found",
      "Root: onboarding change",
      "Evidence attached",
    ],
  },
];

export function ReplayDiagram({ className = "" }: { className?: string }) {
  return (
    <LandingTerminalDiagram
      cards={CARDS}
      idPrefix="replay-diagram"
      ariaLabel="Ask a question, search the Sortiri timeline, and get a replay with linked events, decisions, and evidence."
      className={className}
    />
  );
}
