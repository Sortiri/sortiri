# Sortiri MCP + CLI setup

Connect Cursor to your local Sortiri Timeline so agent work is recorded automatically. Use the CLI watcher to capture factual file changes alongside MCP agent events.

## Prerequisites

1. Start the Next.js app:

```bash
npm run dev
```

2. Start Convex:

```bash
npm run convex:dev
```

3. Open **Sources** in the app, create a workspace API key (`sk_sortiri_…`), and copy it.

4. (Optional, dev only) Set a shared dev ingest fallback in **both** Next.js and Convex:

```bash
# .env.local
SORTIRI_DEV_INGEST_KEY=dev_sortiri_key

# Convex deployment
npx convex env set SORTIRI_DEV_INGEST_KEY dev_sortiri_key
```

Workspace API keys are preferred in production. The dev key is a legacy fallback for local development.

## Initialize Sortiri in your repo

Run once per project:

```bash
npm run sortiri:init
```

When prompted, paste your API key from the Sources page.

Or non-interactive:

```bash
npm run sortiri:init -- --yes --api-key=sk_sortiri_... --workspace-id=<workspace-external-id>
```

This creates:

```txt
.sortiri/config.json   # API URL, key, workspace ID
.sortiri/session.json   # Active workstream (written by MCP, read by watcher)
```

`init` also merges `.cursor/mcp.json` and adds `.sortiri/` to `.gitignore`.

### Config file shape

```json
{
  "apiUrl": "http://localhost:3000",
  "apiKey": "sk_sortiri_...",
  "workspaceId": "<workspace-external-id>",
  "projectId": null,
  "editor": "cursor"
}
```

### Config loading priority

MCP and CLI load config via `@sortiri/local`:

1. Environment variables (`SORTIRI_API_URL`, `SORTIRI_API_KEY`, `SORTIRI_WORKSPACE_ID`, optional `SORTIRI_PROJECT_ID`) — any set value wins
2. `.sortiri/config.json` (path overridable with `SORTIRI_CONFIG_PATH`)
3. Error if required values are missing

## Start the file watcher

In a second terminal:

```bash
npm run sortiri:dev
```

The watcher records `file.created`, `file.changed`, and `file.deleted` events with `source: "watcher"`. When MCP has an active workstream, events attach to it via `.sortiri/session.json`.

## Cursor MCP config

After `sortiri init`, `.cursor/mcp.json` should contain:

```json
{
  "mcpServers": {
    "sortiri": {
      "command": "npx",
      "args": ["tsx", "packages/mcp/src/server.ts"],
      "env": {
        "SORTIRI_CONFIG_PATH": ".sortiri/config.json"
      }
    }
  }
}
```

Restart the Sortiri MCP server in Cursor after changing config.

Legacy env-only MCP config still works if you prefer setting `SORTIRI_API_URL`, `SORTIRI_API_KEY`, and `SORTIRI_WORKSPACE_ID` directly.

## Manual test (Sprint 5 demo)

1. `npm run dev` + `npm run convex:dev`
2. `npm run sortiri:init` (workspace ID from Convex `workspaces.externalId`)
3. `npm run sortiri:dev` in a second terminal
4. Restart Cursor MCP
5. Ask Cursor:

```txt
Start a Sortiri workstream, make a tiny copy change, then finish the workstream.
```

Expected:

- MCP starts workstream → writes session
- MCP records agent events
- Watcher detects file change → records `watcher` event attached to workstream
- MCP finishes workstream → clears session
- Timeline shows agent + watcher events
- Workstream replay interleaves both chronologically

Example replay:

```txt
13:29 Cursor Agent — Started workstream
13:30 Cursor Agent — Created plan
13:31 Sortiri Watcher — Changed app/page.tsx
13:32 Cursor Agent — Completed workstream
```

## MCP tools

| Tool | Purpose |
|---|---|
| `start_workstream` | Begin a replayable task timeline; writes `.sortiri/session.json` |
| `record_event` | Record agent actions, code changes, decisions |
| `attach_artifact` | Attach diffs, files, URLs, logs |
| `finish_workstream` | Complete the active workstream; clears session |
| `sortiri_create_context_pack` | Create and generate a context pack for the current goal |
| `sortiri_get_context_pack` | Fetch a context pack by ID (marks used by agent) |
| `sortiri_get_project_memory` | Ephemeral project memory: events, playbook, failures, validation |
| `sortiri_get_entity_memory` | Entity-scoped memory |
| `sortiri_get_known_failures` | Known failure patterns for a goal or files |
| `sortiri_get_validation_requirements` | Rule-based validation checklist for a goal |
| `sortiri_get_recommended_playbook` | Best-matching active playbook for a goal |
| `sortiri_list_recommendations` | List open recommendations in the autonomy queue |
| `sortiri_get_recommendation` | Get a recommendation by ID |
| `sortiri_generate_recommendations` | Generate recommendations from intelligence signals |
| `sortiri_convert_recommendation_to_workstream` | Convert a recommendation to a workstream with context pack |
| `sortiri_generate_context_from_recommendation` | Generate a context pack from a recommendation |
| `sortiri_generate_eval_suite` | Generate a private eval suite from playbook, lesson, recommendation, context pack, or known failure |
| `sortiri_list_eval_suites` | List active private eval suites for the workspace |
| `sortiri_get_eval_suite` | Get an eval suite with cases and recent runs |
| `sortiri_run_eval_suite` | Queue an eval run (execute locally with `npm run eval:run`) |
| `sortiri_get_eval_run` | Get an eval run with filtered results |
| `sortiri_recommend_evals_for_workstream` | Suggest eval suites linked to a workstream |

## CLI commands

| Command | Purpose |
|---|---|
| `npm run sortiri:init` | Create `.sortiri/` config, merge Cursor MCP, update `.gitignore` |
| `npm run sortiri:dev` | Start local file watcher |
| `sortiri context --goal "..."` | Create or fetch a context pack via API (prints formatted text) |
| `sortiri recommendations list` | List open recommendations |
| `sortiri recommendations generate` | Generate recommendations for the workspace |
| `sortiri recommendations get <id>` | Get a recommendation by ID |
| `sortiri recommendations convert <id>` | Convert a recommendation to a workstream |
| `sortiri evals list` | List active private eval suites |
| `sortiri evals generate --from-recommendation <id>` | Generate an eval suite from a source entity |
| `sortiri evals runs <suiteId>` | List recent runs for a suite |
| `sortiri evals get-run <runId>` | Get an eval run with results |
| `npm run eval:run -- --suite <id>` | Execute eval cases locally and record results |

Local development (without npm scripts):

```bash
npx tsx packages/cli/src/index.ts init
npx tsx packages/cli/src/index.ts dev
```
