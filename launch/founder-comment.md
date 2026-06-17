# Founder comment — Show HN / launch threads

Use this as a first reply on Show HN, Reddit, or LinkedIn.

---

Thanks for the questions — a few notes on why Sortiri exists and how we're thinking about it.

**Why this exists**

AI-native companies ship faster with coding agents, but the work history is fragmented: chat logs, PR diffs, CI output, incident channels. When something breaks, teams can't easily replay what the agent tried, what commands failed, what decision led to a deploy, or what happened after rollback.

Sortiri is an open-source **timeline layer** — one replayable company history for agent work, commands, code changes, decisions, incidents, and outcomes.

**Why local-first**

You should be able to adopt Sortiri without creating a cloud account, sharing workspace IDs, or sending agent history to a vendor first. Local mode writes to `.sortiri/events.jsonl` on disk. You own the data. Export anytime. Inspect with `sortiri dev`.

**What gets recorded**

Meaningful work history — not every token:
- agent actions and plans
- commands (pass/fail)
- code changes
- decisions with rationale
- incidents and rollbacks
- validation results

**How this differs from logs**

Logs are noisy and service-centric. Sortiri events are structured, workstream-scoped, and replayable in order — closer to a company timeline than a log tail.

Think of Sortiri like a black box recorder for agent work — but the product category is the timeline layer.

**Why open-source first**

Teams should be able to inspect the schema, run offline, and contribute integrations. The CLI, MCP server, event schema, and local viewer are Apache-2.0.

**What cloud will add later**

Sortiri Cloud is the managed upgrade: shared team timelines, retention, source health, audit evidence, RBAC, reliability monitoring, and support. Local mode remains the default entry point.

**Feedback we need**

1. What events are missing from your agent workflow?
2. What would make `sortiri init` + Cursor/MCP setup frictionless?
3. Where should local mode stop and cloud begin for your team?

Repo: https://github.com/sortiri/sortiri
