# CLI reference

Sortiri CLI — open-source timeline layer for AI-native companies.

```bash
npx sortiri <command>
```

## Core commands (local + cloud)

### `sortiri init`

Initialize Sortiri in the current repo.

```bash
sortiri init --yes              # local mode, no prompts
sortiri init --token <token>    # cloud mode via setup token
sortiri init --local            # force local mode
sortiri init --force-rules      # overwrite Cursor Sortiri rule
```

Creates `.sortiri/config.json`, `.sortiri/events.jsonl`, `.cursor/mcp.json`, `.cursor/rules/sortiri.mdc`, and updates `.gitignore`.

### `sortiri doctor`

Verify setup. Passes in local mode without cloud credentials.

```bash
sortiri doctor
sortiri doctor --no-record     # skip recording validation event
```

### `sortiri dev`

Start the local timeline viewer (default in local mode).

```bash
sortiri dev
sortiri dev --port 4318
sortiri dev --smoke            # bind and exit (sanity/CI)
sortiri dev --watch            # cloud file watcher (cloud mode)
```

### `sortiri record`

Append an event to the local journal.

```bash
sortiri record --type agent.action --title "Updated onboarding flow"
sortiri record --type validation.passed --title "Tests passed" --summary "npm test green"
sortiri record --type agent.action --title "Fix bug" --workstream ws_abc123
```

### `sortiri export`

Export `.sortiri/events.jsonl`.

```bash
sortiri export
sortiri export --out timeline.jsonl
```

### `sortiri mcp`

Start the Sortiri MCP server on stdio (used by Cursor).

```bash
sortiri mcp
```

Configured in `.cursor/mcp.json` as `npx sortiri mcp`.

### `sortiri run`

Run a command and capture output to the timeline.

```bash
sortiri run -- npm test
sortiri run -- npm run build
sortiri run -- npx tsc --noEmit
```

## Cloud commands

Require cloud mode (`sortiri init --token` or API key setup).

### Context

```bash
sortiri context --goal "Fix checkout timeout"
sortiri context --pack-id <id>
```

### Recommendations

```bash
sortiri recommendations list
sortiri recommendations generate
sortiri recommendations get <id>
sortiri recommendations convert <id>
```

### Decisions

```bash
sortiri decisions record --title "Use JSONL for local journal" --rationale "Portable, append-only"
sortiri decisions list
sortiri decisions get <id>
```

### Incidents

```bash
sortiri incidents record --title "Deploy rollback" --severity error
sortiri incidents list
sortiri incidents resolve <id>
```

### Evals

```bash
sortiri evals list
sortiri evals generate --from-recommendation <id>
sortiri evals runs <suiteId>
```

### Reliability

```bash
sortiri reliability health
sortiri reliability dead-letters
sortiri reliability replay
```

## Development (monorepo)

When developing Sortiri from source:

```bash
npm run sortiri:init
npm run sortiri:dev
npx tsx packages/cli/src/index.ts doctor
```

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SORTIRI_CONFIG_PATH` | Override config file path |
| `SORTIRI_API_URL` | Cloud API URL |
| `SORTIRI_API_KEY` | Cloud API key |
| `SORTIRI_WORKSPACE_ID` | Workspace external ID |
| `SORTIRI_PROJECT_ID` | Optional project ID |

Environment variables override `.sortiri/config.json` when set.

## See also

- [quickstart.md](quickstart.md)
- [mcp.md](mcp.md)
- [export.md](export.md)
