# Sortiri demo script (5–7 minutes)

Use this script for a live demo, Loom recording, or conference booth. Target: show local-first timeline value in under 5 minutes.

**Positioning:** Open-source timeline layer for AI-native companies.

## Setup (before recording)

```bash
npm run demo:oss
# or manually:
cd examples/demo-agent-project
cat .sortiri/events.jsonl | head -3
```

Have terminal + browser side by side. Optional: Cursor with `examples/demo-agent-project/.cursor/rules/sortiri.mdc`.

See also: [demo-terminal-flow.md](demo-terminal-flow.md), [demo-shot-list.md](demo-shot-list.md).

---

## 1. Hook (30s)

> "AI-native companies need a timeline — not just chat logs. Sortiri records agent actions, commands, diffs, decisions, incidents, and rollbacks into one replayable company history. Local-first. No cloud required."

## 2. Init (60s)

```bash
npx sortiri init --yes
sortiri doctor
```

Point out `.sortiri/config.json`, `.sortiri/events.jsonl`, `.cursor/mcp.json`.

## 3. Record events (90s)

```bash
sortiri record --type agent.action --title "Updated onboarding flow"
sortiri record --type decision.recorded --title "Use local-first timeline before cloud sync"
sortiri record --type command.run --title "npm run test"
sortiri record --type incident.opened --title "Checkout validation failed"
sortiri record --type rollback.recorded --title "Reverted checkout experiment"
```

## 4. Export (30s)

```bash
sortiri export --out timeline.jsonl
wc -l timeline.jsonl
```

## 5. Local timeline (60s)

```bash
sortiri dev
```

Open `http://127.0.0.1:4317` — show grouped events, source/type badges, export CTA.

## 6. Open Source vs Cloud (30s)

> "Everything you saw is local JSONL you own. Sortiri Cloud is optional — shared history, retention, audits, RBAC, reliability when your team needs it."

## 7. CTA (15s)

> "Star us on GitHub if you're building with coding agents: github.com/sortiri/sortiri"

---

## Do not say

- "Black box recorder" as the product category (optional metaphor only in long-form copy)
