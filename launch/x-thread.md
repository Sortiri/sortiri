# X / Twitter thread — Sortiri launch

## Tweet 1 (hook)

AI-native companies need a timeline.

Sortiri is an open-source timeline layer that records agent actions, commands, diffs, decisions, incidents, rollbacks, product events, and outcomes into one replayable company history.

Local-first. No cloud required.

🧵

## Tweet 2 (problem)

Agent sessions are ephemeral.

You get a diff at the end, maybe a PR — but not:
• why a decision was made
• what commands failed
• what was tried before the fix
• who/what opened an incident

That history should survive the session.

## Tweet 3 (solution)

Sortiri records structured events into `.sortiri/events.jsonl`.

Works with Cursor rules, MCP, and CLI:

```bash
npx sortiri init
sortiri record --type code.changed --title "Fixed auth redirect"
sortiri run -- npm test
sortiri export
```

## Tweet 4 (agent workflow)

Agents can:
• start/finish workstreams
• attach artifacts (diffs, logs, URLs)
• record decisions with rationale + rollback plan
• open/resolve incidents

All from MCP tools or `sortiri record`.

## Tweet 5 (local vs cloud)

Local mode = your machine, your data, JSONL journal.

Sortiri Cloud = shared history, retention, source health, audits, RBAC, reliability, support.

OSS core stays local-first. Cloud is optional.

## Tweet 6 (CTA)

⭐ Star: https://github.com/sortiri/sortiri
📖 Demo: `npm run demo:oss` or `examples/demo-agent-project/`
💬 What would you want in a company timeline? Reply below.

#AIAgents #OpenSource #DevTools #Cursor #MCP
