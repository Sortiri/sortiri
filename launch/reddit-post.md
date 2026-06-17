# Reddit post — r/LocalLLaMA / r/programming / r/cursor

**Title:** I built an open-source timeline layer for AI-native companies

**Body:**

I've been working on **Sortiri** — an open-source timeline layer that records what AI agents do during a coding session so you can replay, audit, and export the history later.

### Why

When you use Cursor, Claude Code, or similar agents, the useful context (commands run, decisions made, failed attempts, incident notes) usually vanishes when the chat ends. AI-native companies need more than chat logs — they need a timeline of what agents did, what changed, why it changed, and what happened after.

### How it works

1. `npx sortiri init` in your repo
2. Add Cursor rules or use MCP tools so the agent records meaningful steps
3. Events go to `.sortiri/events.jsonl` (local-first — no account required)
4. `sortiri dev` opens a local timeline viewer
5. `sortiri export` for a portable timeline

Event types include `agent.action`, `command.run`, `command.failed`, `code.changed`, `decision.recorded`, `incident.opened`, `rollback.recorded`, `validation.passed`.

### Optional cloud

Sortiri Cloud is the managed version for teams that need shared history, retention, source health, audits, RBAC, reliability, and support. The OSS path is fully usable offline.

### Links

- Repo: https://github.com/sortiri/sortiri
- Example project with sample events: `examples/demo-agent-project/`

Looking for feedback on what belongs in a company timeline and what integrations matter most. Happy to answer questions.

---

*Adjust subreddit-specific tone; avoid cross-posting identical text to multiple subs on the same day.*
