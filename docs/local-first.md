# Local-first architecture

Sortiri defaults to local mode — an open-source timeline layer you run on your machine. Your timeline lives on disk with no cloud account and no network calls for recording.

## Directory layout

After `sortiri init`:

```txt
.sortiri/
  config.json       # mode, editor, optional cloud credentials
  session.json      # active workstream (gitignored)
  events.jsonl      # append-only timeline journal
.cursor/
  mcp.json          # MCP server config
  rules/
    sortiri.mdc     # agent recording rules
```

## Config

`.sortiri/config.json` in local mode:

```json
{
  "mode": "local",
  "editor": "cursor",
  "projectId": null
}
```

No `apiKey` or `workspaceId` required.

## Event journal

Events are stored as one JSON object per line in `.sortiri/events.jsonl`:

- Append-only — new events are added, not edited in place
- Human-readable — open in any text editor
- Portable — `sortiri export` copies the full journal
- Validated — each line is checked against the canonical schema

See [event-schema.md](event-schema.md).

## Session file

When an agent starts a workstream via MCP, `.sortiri/session.json` tracks the active workstream ID. This file is gitignored because it is ephemeral session state.

## Local viewer

`sortiri dev` starts a minimal HTTP server that reads `events.jsonl` and displays events reverse-chronologically. Default bind: `127.0.0.1:4317`.

Options:

```bash
sortiri dev --port 4318
sortiri dev --host 127.0.0.1
sortiri dev --smoke    # bind and exit (for CI/sanity)
```

## What stays local

In local mode:

- `sortiri record` writes to JSONL only
- MCP core tools (`start_workstream`, `record_event`, `finish_workstream`) write to JSONL
- `sortiri export` reads from disk
- `sortiri doctor` does not require cloud credentials

Advanced MCP tools (context packs, recommendations, evals) require cloud mode.

## Data ownership

You own `.sortiri/events.jsonl`. Back it up, export it, or delete it at any time. Sortiri does not phone home in local mode.

## Optional cloud

Connect Sortiri Cloud when your team needs shared timelines, retention, integrations, and RBAC. Local mode continues to work — cloud is additive. See [cloud.md](cloud.md).

## Privacy note

Event metadata may include file paths, command names, and diffs from your repo. Review exports before sharing. See [security.md](security.md).
