# Sortiri

**Open-source timeline layer for AI-native companies.**

Sortiri records agent actions, commands, diffs, decisions, incidents, rollbacks, product events, and outcomes into one replayable company timeline.

## Quick start

```bash
npx sortiri init
sortiri dev
```

Add agent rules from [`sortiri/sortiri`](https://github.com/sortiri/sortiri/tree/main/examples/cursor) or connect MCP for richer recording.

## Local-first

Events are stored in `.sortiri/events.jsonl` on your machine. No account required. Export anytime:

```bash
sortiri export > timeline.jsonl
```

## Cloud (optional)

[Sortiri Cloud](https://sortiri.com) adds team timelines, integrations (GitHub, Slack, Stripe, PostHog), and enterprise reliability features. The OSS core works fully offline.

## Repositories

| Repo | Description |
|------|-------------|
| [sortiri/sortiri](https://github.com/sortiri/sortiri) | Monorepo — CLI, MCP, SDK, platform |

## Community

- [Issues](https://github.com/sortiri/sortiri/issues) — bugs, features, docs
- [Discussions](https://github.com/sortiri/sortiri/discussions) — questions & ideas
- [Website](https://sortiri.com)

## License

Apache-2.0
