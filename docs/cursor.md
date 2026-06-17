# Cursor setup

Configure Cursor to record agent work with Sortiri.

## Automatic setup

```bash
npx sortiri init --yes
```

This writes:

- `.cursor/mcp.json` — MCP server config (`npx sortiri mcp`)
- `.cursor/rules/sortiri.mdc` — Agent recording rules

Restart the Sortiri MCP server in Cursor after init.

## Agent rules

The Sortiri rule tells agents to:

1. Start or continue a workstream for meaningful tasks
2. Record plans, decisions, code changes, validation, incidents, and rollbacks
3. Attach useful artifacts (diffs, logs, command output)
4. Finish the workstream when done
5. Use `sortiri run --` for validation commands
6. Use `sortiri export` when the user wants a portable timeline

Rules are copied from `packages/agent-rules/cursor/sortiri.mdc` in the Sortiri repo.

Overwrite an existing rule:

```bash
sortiri init --force-rules
```

## Starter prompt

Use this template when starting agent work in a Sortiri-recorded project:

```txt
You are working inside a Sortiri-recorded project.

Before making changes:
1. Read existing Sortiri context if available.
2. Start or continue a workstream.
3. Record important commands, diffs, decisions, validation, incidents, and rollbacks.
4. Use sortiri doctor before setup changes.
5. Use sortiri export if the user wants a portable timeline.

Task:
[USER TASK HERE]
```

## Example workflow

1. `sortiri init --yes && sortiri doctor`
2. `sortiri dev` (optional — open local viewer)
3. In Cursor, restart Sortiri MCP
4. Ask the agent:

```txt
Start a Sortiri workstream, update README with a one-line change,
run tests with sortiri run, then finish the workstream.
```

5. Refresh the local viewer or run `sortiri export`

## Expected timeline

```txt
13:29 Cursor Agent — Started workstream
13:30 Cursor Agent — Created plan
13:31 Sortiri Watcher — Changed README.md        (cloud + --watch only)
13:32 Cursor Agent — Validation passed
13:33 Cursor Agent — Completed workstream
```

In local mode without a file watcher, agent-recorded events appear via MCP.

## MCP server

See [mcp.md](mcp.md) for MCP configuration and tool reference.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| MCP not connected | Restart Sortiri MCP in Cursor settings |
| Doctor fails | Run `sortiri init --yes` again |
| No events in viewer | Check `.sortiri/events.jsonl`; run `sortiri record` to test |
| Cloud tools unavailable | Expected in local mode — see [cloud.md](cloud.md) |

## See also

- [quickstart.md](quickstart.md)
- [local-first.md](local-first.md)
