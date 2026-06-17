# Export

Export your local Sortiri timeline as portable JSONL.

## Basic export

Print all events to stdout:

```bash
sortiri export
```

Write to a file:

```bash
sortiri export --out timeline.jsonl
sortiri export --out ./backups/sortiri-2026-06-17.jsonl
```

## Format

Each line is one JSON event per the [event schema](event-schema.md):

```jsonl
{"id":"evt_...","timestamp":1780000000000,"source":"system","type":"system.event","title":"Sortiri initialized",...}
{"id":"evt_...","timestamp":1780000001000,"source":"cli","type":"agent.action","title":"Updated onboarding flow",...}
```

JSONL is:

- **Append-friendly** — add lines without parsing the whole file
- **Streamable** — process line by line with `jq`, Python, or any JSON tool
- **Portable** — no Sortiri Cloud required to read exports

## Example: filter with jq

```bash
sortiri export | jq -c 'select(.type == "agent.action")'
```

## Example: count events by type

```bash
sortiri export | jq -r '.type' | sort | uniq -c
```

## What gets exported

`sortiri export` reads `.sortiri/events.jsonl` from the current repo (or `SORTIRI_CONFIG_PATH` directory). It includes all valid events; corrupt lines are skipped.

## Before sharing

Review exports for:

- API keys in command output
- File paths or code you should not share
- Customer or internal data in summaries

See [security.md](security.md).

## Archive workflow

```bash
# Record work
sortiri run -- npm test

# Export snapshot
sortiri export --out artifacts/timeline-$(date +%Y%m%d).jsonl
```

## Cloud timelines

Local export covers the on-disk journal. Cloud workspace timelines are exported through the Sortiri Cloud UI or API (separate from `sortiri export`).

## See also

- [event-schema.md](event-schema.md)
- [local-first.md](local-first.md)
