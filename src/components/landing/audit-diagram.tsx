import {
  LandingTerminalDiagram,
  type TerminalDiagramCard,
} from "@/components/landing/landing-terminal-diagram";

const CARDS: TerminalDiagramCard[] = [
  {
    id: "history",
    title: "COMPANY HISTORY",
    rows: [
      "agent actions",
      "GitHub PRs",
      "product events",
      "Stripe revenue",
      "company decisions",
    ],
  },
  {
    id: "audit",
    title: "SORTIRI AUDIT",
    rows: [
      "collect evidence",
      "link decisions to diffs",
      "detect missing context",
      "redact sensitive data",
      "freeze audit trail",
    ],
  },
  {
    id: "report",
    title: "SECURE REPORT",
    rows: [
      "frozen timeline",
      "redacted artifacts",
      "auditor share link",
      "exportable report",
      "proof, not screenshots",
    ],
  },
];

export function AuditDiagram({ className = "" }: { className?: string }) {
  return (
    <LandingTerminalDiagram
      cards={CARDS}
      idPrefix="audit-diagram"
      ariaLabel="Sortiri collects company history into an audit trail and produces a secure report with frozen timeline, redacted artifacts, and exportable proof."
      className={className}
    />
  );
}
