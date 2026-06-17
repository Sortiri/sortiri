# Security Policy

## Reporting vulnerabilities

If you discover a security vulnerability in Sortiri, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead:

1. Use [GitHub Security Advisories](https://github.com/sortiri/sortiri/security/advisories/new) for private disclosure, or
2. Open a minimal report via GitHub Issues with the `security` label only if private advisory is unavailable — omit exploit details and sensitive data.

We will acknowledge receipt and work on a fix. Please allow reasonable time before public disclosure.

## What not to include in issues

Do not paste into public issues or PRs:

- API keys (`sk_sortiri_...`, setup tokens, webhook secrets)
- Workspace IDs, project IDs, or deployment URLs from production
- `.sortiri/config.json` contents
- Exported timelines containing proprietary code or customer data
- Command output with environment variables or credentials

Use redacted, synthetic examples only.

## Secret handling

- Local mode stores events in `.sortiri/events.jsonl` on disk — treat this file as sensitive if it contains command output or diffs
- `config.json` and `session.json` are gitignored by default; do not commit them
- Agents should not record secrets in event titles, summaries, or metadata
- When cloud sync is enabled, data is sent to your Sortiri Cloud workspace — review what you record

## Local data warning

Local mode keeps all timeline data on your machine. You are responsible for:

- File permissions on `.sortiri/`
- Backing up or exporting timelines before disk cleanup
- Not sharing exported JSONL files that contain secrets

Run `sortiri export` only when you intend to share or archive the timeline.

## Cloud sync warning

If you connect Sortiri Cloud (`sortiri init --token` or manual API key setup):

- Events and artifacts may be stored in your cloud workspace
- Integrations (GitHub, Stripe, PostHog, Slack) may ingest external data
- Review [docs/cloud.md](docs/cloud.md) and [docs/security.md](docs/security.md) before enabling cloud mode in sensitive environments

## Supported versions

Security fixes are applied to the latest release on the `main` branch. Upgrade to the latest version when possible.
