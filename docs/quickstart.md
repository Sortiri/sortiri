# Quickstart

Get Sortiri running locally in about five minutes. Sortiri is an open-source timeline layer for AI-native companies — no cloud account required.

## Prerequisites

- Node.js 18+
- A git repository (your project)
- Cursor or another MCP-capable editor (optional, for agent recording)

## Install and initialize

From your project root:

```bash
npx sortiri init --yes
```

This creates:

```txt
.sortiri/config.json      # local mode config
.sortiri/events.jsonl      # timeline journal (with sample event)
.cursor/mcp.json            # MCP server config
.cursor/rules/sortiri.mdc   # agent recording rules
```

`.sortiri/config.json` and `.sortiri/session.json` are added to `.gitignore`.

## Verify setup

```bash
sortiri doctor
```

Doctor checks config, events journal, MCP config, Cursor rules, and that the local viewer can start.

## View your timeline

```bash
sortiri dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317) to see events from `.sortiri/events.jsonl`.

## Record an event

```bash
sortiri record --type agent.action --title "Updated onboarding flow" --summary "Changed CTA copy"
```

Refresh the viewer to see the new event.

## Export

```bash
sortiri export --out timeline.jsonl
```

## Connect Cursor

1. Restart the Sortiri MCP server in Cursor (after `init` writes `.cursor/mcp.json`)
2. Ask your agent to follow the Sortiri rules in `.cursor/rules/sortiri.mdc`

Example task:

```txt
Start a Sortiri workstream, make a small docs change, record validation, then finish the workstream.
```

## Capture command output

Wrap validation commands:

```bash
sortiri run -- npm test
sortiri run -- npm run lint
```

## Next steps

- [Local-first architecture](local-first.md)
- [MCP setup](mcp.md)
- [Cursor setup](cursor.md)
- [Event schema](event-schema.md)

## Optional: Sortiri Cloud

To sync timelines to a team workspace, see [cloud.md](cloud.md).
