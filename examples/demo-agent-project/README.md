# Demo agent project

Minimal example repo showing what a Sortiri-recorded agent session looks like.

## What's included

| Path | Purpose |
|------|---------|
| `.sortiri/events.jsonl` | Live local journal with sample event types |
| `.cursor/rules/sortiri.mdc` | Cursor rules for agent recording |
| `exported-timeline.jsonl` | Frozen export for demos / docs |

## Sample event types

- `agent.action` — exploration and planning
- `command.run` — wrapped shell commands
- `code.changed` — meaningful edits
- `decision.recorded` — architecture choice with rationale
- `incident.opened` — production issue narrative
- `rollback.recorded` — rollback event
- `validation.passed` — tests or checks succeeded

## Try it

```bash
# From monorepo root (uses workspace CLI)
npx sortiri record --type agent.action --title "Demo step" --cwd examples/demo-agent-project

# View journal
cat .sortiri/events.jsonl | jq -c '{type, title}'

# Export
npx sortiri export --cwd examples/demo-agent-project
```

## Use in demos

See [`launch/demo-script.md`](../../launch/demo-script.md) for a 5-minute walkthrough.
