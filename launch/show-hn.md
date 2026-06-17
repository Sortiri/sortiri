# Show HN — Sortiri

**Title (≤80 chars):** Show HN: Sortiri — open-source timeline layer for AI-native companies

**URL:** https://github.com/sortiri/sortiri

---

Hi HN — I'm building Sortiri, an open-source timeline layer for AI-native companies.

**The problem:** Agents change code, run commands, make decisions, and open incidents — but that history disappears when the session ends. Teams can't replay what happened, audit agent behavior, or learn from past failures.

**What Sortiri does:**
- Records workstreams, events, decisions, and incidents from Cursor, Claude Code, Codex, or the CLI
- **Local-first:** events live in `.sortiri/events.jsonl` — no cloud required
- Optional cloud sync for teams (timeline UI, integrations, reliability ingest)
- MCP tools + Cursor rules so agents record context as they work
- `sortiri export` for portable timelines

**Try it locally (2 min):**

```bash
npx sortiri init
sortiri doctor
sortiri dev
sortiri record --type agent.action --title "Explored auth module"
sortiri export > timeline.jsonl
```

Demo project with sample events: `examples/demo-agent-project/`

I'd love feedback on:
1. What you'd want in a company timeline for agent work
2. Local-only vs cloud — where the line should be for OSS
3. MCP / CLI ergonomics for your workflow

Happy to answer questions in the thread.
