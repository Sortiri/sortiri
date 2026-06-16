export type HighlightCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  labels: string[];
  visualAriaLabel: string;
};

export const HIGHLIGHT_CARDS: HighlightCard[] = [
  {
    id: "reliability",
    eyebrow: "DURABLE COMPANY MEMORY",
    title: "Enterprise-grade reliability",
    body: "Designed for durable ingest, idempotent events, replayable history, backups, and recovery paths — so agent activity does not disappear when systems fail.",
    labels: ["ingest", "dedupe", "journal", "replay", "restore"],
    visualAriaLabel:
      "Reliability pipeline labels: ingest, dedupe, journal, replay, and restore.",
  },
  {
    id: "agent-infra",
    eyebrow: "BUILT FOR AGENT WORK",
    title: "Agent-first infrastructure",
    body: "Capture the full trail behind agent work: prompts, commands, diffs, PRs, decisions, validations, failures, and outcomes.",
    labels: ["prompt", "command", "diff", "PR", "eval", "impact"],
    visualAriaLabel:
      "Agent work trail labels: prompt, command, diff, PR, eval, and impact.",
  },
  {
    id: "developer-setup",
    eyebrow: "ONE MINUTE TO START",
    title: "Developer-first setup",
    body: "Install the SDK, CLI, or MCP server and start recording company history from your existing stack — Cursor, GitHub, PostHog, Stripe, Slack, and more.",
    labels: ["SDK", "CLI", "MCP", "API", "webhooks"],
    visualAriaLabel: "Integration surface labels: SDK, CLI, MCP, API, and webhooks.",
  },
  {
    id: "private",
    eyebrow: "COMPANY-OWNED EVALS",
    title: "Private by design",
    body: "Turn your own workstreams, failures, playbooks, and rollbacks into private evals for agents, models, and routing decisions.",
    labels: [
      "private evals",
      "redaction",
      "permissions",
      "audit trail",
      "model routing",
    ],
    visualAriaLabel:
      "Privacy and control labels: private evals, redaction, permissions, audit trail, and model routing.",
  },
];
