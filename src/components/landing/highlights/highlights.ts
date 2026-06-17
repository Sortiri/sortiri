export type HighlightCard = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
};

export const HIGHLIGHT_CARDS: HighlightCard[] = [
  {
    id: "reliability",
    eyebrow: "DURABLE COMPANY MEMORY",
    title: "Enterprise-grade reliability",
    body: "Durable ingest, idempotent events, and replayable history when systems fail.",
  },
  {
    id: "agent-infra",
    eyebrow: "BUILT FOR AGENT WORK",
    title: "Agent-first infrastructure",
    body: "Prompts, commands, diffs, decisions, validations, and outcomes in one timeline.",
  },
  {
    id: "developer-setup",
    eyebrow: "ONE MINUTE TO START",
    title: "Developer-first setup",
    body: "SDK, CLI, or MCP — record from Cursor, GitHub, Slack, and your stack.",
  },
  {
    id: "private",
    eyebrow: "COMPANY-OWNED EVALS",
    title: "Private by design",
    body: "Workstreams and rollbacks become private evals with permissions and redaction.",
  },
];
