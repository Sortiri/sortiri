# MCP setup

Sortiri exposes an MCP (Model Context Protocol) server so agents can record workstreams, events, and artifacts.

## Configuration

After `sortiri init`, `.cursor/mcp.json` includes:

```json
{
  "mcpServers": {
    "sortiri": {
      "command": "npx",
      "args": ["sortiri", "mcp"],
      "env": {
        "SORTIRI_CONFIG_PATH": ".sortiri/config.json"
      }
    }
  }
}
```

Restart the Sortiri MCP server in Cursor after changing config.

## Manual setup

If you prefer to configure MCP yourself:

```json
{
  "mcpServers": {
    "sortiri": {
      "command": "npx",
      "args": ["sortiri", "mcp"]
    }
  }
}
```

Ensure `.sortiri/config.json` exists (`sortiri init --yes`) or set `SORTIRI_CONFIG_PATH`.

## Local vs cloud

| Mode | Behavior |
|------|----------|
| **Local** | Core workstream tools write to `.sortiri/events.jsonl` |
| **Cloud** | Events ingest to your workspace; advanced tools available |

Local mode does not require cloud. Cloud sync is optional.

## Core tools (local + cloud)

| Tool | Purpose |
|------|---------|
| `start_workstream` | Begin a replayable task timeline |
| `record_event` | Record agent actions, code changes, decisions |
| `attach_artifact` | Attach diffs, files, URLs, logs |
| `finish_workstream` | Complete the active workstream |

## Cloud tools

Available when connected to Sortiri Cloud:

- Context packs: `sortiri_create_context_pack`, `sortiri_get_context_pack`
- Memory: `sortiri_get_project_memory`, `sortiri_get_entity_memory`, `sortiri_get_known_failures`
- Recommendations and evals
- Decisions and incidents

Cloud-only tools return a clear message in local mode.

## How it works

```txt
Cursor Agent calls MCP tools
        ↓
Sortiri MCP server (stdio)
        ↓
Local: append to events.jsonl + session.json
Cloud: ingest to workspace API
        ↓
Replay via sortiri dev or Sortiri Cloud UI
```

## Verify MCP

```bash
sortiri doctor
```

Doctor checks that `.cursor/mcp.json` contains a `sortiri` entry.

## Test manually

```bash
sortiri mcp
```

Runs the MCP server on stdio (for debugging; Cursor manages this in normal use).

## See also

- [cursor.md](cursor.md) — Agent rules and starter prompt
- [cli.md](cli.md) — CLI commands
- [local-first.md](local-first.md) — Local journal
