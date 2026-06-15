import {
  LandingTerminalDiagram,
  type TerminalDiagramCard,
} from "@/components/landing/landing-terminal-diagram";

const CARDS: TerminalDiagramCard[] = [
  {
    id: "employees",
    title: "EMPLOYEES + AGENTS",
    rows: [
      "eng team: Cursor agents",
      "product: research agents",
      "growth: content agents",
      "support: ticket agents",
      "ops: workflow agents",
    ],
  },
  {
    id: "org-timeline",
    title: "SORTIRI ORG TIMELINE",
    rows: [
      "agent actions by team",
      "duplicated workstreams",
      "failed commands + retries",
      "shipped PRs + decisions",
      "product + revenue outcomes",
    ],
  },
  {
    id: "control",
    title: "COMPANY CONTROL",
    rows: [
      "token spend by project",
      "duplicate work found",
      "impact by workstream",
      "risky changes flagged",
      "audit-ready evidence",
    ],
  },
];

export function EnterpriseDiagram({ className = "" }: { className?: string }) {
  return (
    <LandingTerminalDiagram
      cards={CARDS}
      idPrefix="enterprise-diagram"
      ariaLabel="Sortiri tracks agent usage across teams into an org timeline with token spend, impact by workstream, and audit-ready evidence."
      className={className}
    />
  );
}
