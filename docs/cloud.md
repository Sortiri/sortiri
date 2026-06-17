# Sortiri Cloud

Sortiri Cloud is the managed upgrade for teams. Local mode remains the default — cloud is optional.

## When to use cloud

Consider Sortiri Cloud when you need:

- Hosted team workspaces and shared timelines
- Managed retention and source health
- Audit evidence rooms and redaction workflows
- RBAC and SSO (planned)
- Reliability monitoring (ingest journal, replay, dead letters)
- Integrations: GitHub, Stripe, PostHog, Slack, observability webhooks
- Enterprise support

For solo development or local agent recording, stay in local mode. See [local-first.md](local-first.md).

## Connect with a setup token

1. Create a workspace in Sortiri Cloud
2. Generate a one-time setup token from **Sources**
3. Run:

```bash
sortiri init --token <setup-token>
```

This writes cloud credentials to `.sortiri/config.json` (`mode: "cloud"`).

## Manual cloud setup

Advanced users can pass credentials directly:

```bash
sortiri init --api-key <key> --workspace-id <workspace-external-id> --api-url <api-url>
```

Do not commit API keys. `config.json` is gitignored by default.

## Cloud vs local behavior

| Feature | Local | Cloud |
|---------|-------|-------|
| Event journal | `.sortiri/events.jsonl` | Convex + local journal |
| Timeline viewer | `sortiri dev` | Sortiri web app |
| MCP workstream tools | JSONL | Cloud ingest + JSONL |
| Context packs, evals | Not available | Available |
| Integrations | Not available | Available |
| File watcher | Optional `--watch` | `sortiri dev --watch` |

## Switching modes

- **Local → cloud:** `sortiri init --token <token>` (overwrites config)
- **Cloud → local:** `sortiri init --yes` or `sortiri init --local`

Exported JSONL from local mode can be kept as an archive; cloud timelines are separate.

## Pricing

See [sortiri.com/pricing](https://sortiri.com/pricing) for current cloud plans.

## Security

Cloud mode sends recorded events to your workspace. Review [security.md](security.md) before enabling in sensitive environments.

Do not paste real API keys or workspace IDs into issues or docs.
