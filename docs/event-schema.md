# Event schema

Each event in Sortiri is a JSON object stored as one line in `.sortiri/events.jsonl` (JSONL format).

## Canonical shape

```json
{
  "id": "evt_example",
  "timestamp": 1780000000000,
  "source": "cursor",
  "type": "agent.action",
  "title": "Updated onboarding flow",
  "summary": "Changed onboarding page copy and CTA",
  "project": "web",
  "workstream": "ws_example",
  "actor": {
    "type": "agent",
    "name": "Cursor Agent"
  },
  "metadata": {
    "files": ["src/app/onboarding/page.tsx"],
    "commands": ["npm run test"]
  }
}
```

## Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique event ID (`evt_` prefix) |
| `timestamp` | number | Unix milliseconds |
| `source` | string | Origin: `cursor`, `cli`, `watcher`, `system`, etc. |
| `type` | string | Event type (see below) |
| `title` | string | Short human-readable title |

## Optional fields

| Field | Type | Description |
|-------|------|-------------|
| `summary` | string | Longer explanation |
| `project` | string | Project name or ID |
| `workstream` | string | Workstream ID (`ws_` prefix) |
| `actor` | object | `{ type, name }` — agent, human, or system |
| `metadata` | object | Arbitrary structured data (files, commands, URLs) |

## Actor types

| `actor.type` | Meaning |
|--------------|---------|
| `agent` | AI agent (Cursor, Claude Code, etc.) |
| `human` | Human developer |
| `system` | Sortiri CLI or automation |
| `customer` | End user (integrations) |

## Core event types

| Type | When to use |
|------|-------------|
| `agent.action` | Agent plan, tool call, task step |
| `command.run` | Shell command executed |
| `command.failed` | Command exited non-zero |
| `code.changed` | File created, modified, or deleted |
| `decision.recorded` | Architecture, product, or security decision |
| `incident.opened` | Outage, deploy failure, production error |
| `incident.resolved` | Incident closed after remediation |
| `rollback.recorded` | Deploy or config rollback |
| `validation.passed` | Tests, lint, typecheck succeeded |
| `validation.failed` | Validation failed |
| `product.event` | Product analytics signal |
| `revenue.event` | Billing or revenue signal |
| `system.event` | Sortiri init, doctor, or system message |

## Event sources

Common `source` values:

- `cursor` — Cursor agent via MCP
- `cli` — Sortiri CLI (`record`, `run`, `doctor`)
- `watcher` — File watcher (cloud mode)
- `system` — Sortiri initialization
- `github`, `stripe`, `posthog`, `slack` — Integrations (cloud)

## Workstreams

Workstreams group related events into a replayable task timeline.

- ID format: `ws_` + hex
- Started via MCP `start_workstream`
- Active workstream stored in `.sortiri/session.json`
- Finished via MCP `finish_workstream`

## Metadata conventions

Use `metadata` for structured context:

```json
{
  "files": ["src/lib/auth.ts"],
  "commands": ["npm test"],
  "exitCode": 0,
  "artifactIds": ["art_..."]
}
```

Avoid secrets in metadata.

## Examples by type

### Agent action

```json
{
  "id": "evt_example",
  "timestamp": 1780000000000,
  "source": "cursor",
  "type": "agent.action",
  "title": "Updated onboarding flow",
  "summary": "Changed onboarding page copy and CTA",
  "actor": { "type": "agent", "name": "Cursor Agent" },
  "metadata": { "files": ["src/app/onboarding/page.tsx"] }
}
```

### Command

```json
{
  "id": "evt_example",
  "timestamp": 1780000001000,
  "source": "cli",
  "type": "command.run",
  "title": "npm run test",
  "summary": "All tests passed",
  "metadata": { "command": "npm run test", "exitCode": 0 }
}
```

### Decision

```json
{
  "id": "evt_example",
  "timestamp": 1780000002000,
  "source": "cursor",
  "type": "decision.recorded",
  "title": "Use local-first timeline before cloud sync",
  "summary": "Start with JSONL; add cloud when team needs shared history",
  "metadata": { "category": "architecture" }
}
```

### Incident

```json
{
  "id": "evt_example",
  "timestamp": 1780000003000,
  "source": "cli",
  "type": "incident.opened",
  "title": "Checkout validation failed",
  "summary": "Elevated 5xx on /checkout",
  "metadata": { "severity": "high", "service": "api" }
}
```

### Rollback

```json
{
  "id": "evt_example",
  "timestamp": 1780000004000,
  "source": "cli",
  "type": "rollback.recorded",
  "title": "Reverted checkout experiment",
  "metadata": { "fromVersion": "v2.1.0", "toVersion": "v2.0.9" }
}
```

### Validation

```json
{
  "id": "evt_example",
  "timestamp": 1780000005000,
  "source": "cli",
  "type": "validation.passed",
  "title": "Post-rollback tests passed",
  "metadata": { "command": "npm run test:integration", "exitCode": 0 }
}
```

## Validation

The local journal validates each line with Zod before append. Corrupt lines are skipped on read.

Schema source: `packages/sortiri-local/src/events.ts`

## Cloud schema

Cloud mode uses an extended schema in Convex with categories, severities, artifacts, and entity links. The local JSONL shape is the portable subset.

## See also

- [export.md](export.md) — Export JSONL
- [local-first.md](local-first.md) — Journal location
