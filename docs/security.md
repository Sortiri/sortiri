# Security

Sortiri handles sensitive work history — file paths, diffs, command output, and decisions. Handle it carefully.

## Local mode

Local mode does not require sending data to Sortiri Cloud.

- Events stay in `.sortiri/events.jsonl` on your machine
- You control what is recorded
- Timeline can be exported with `sortiri export`
- Secrets should not be recorded
- Redaction is planned/available where implemented

## Do not record secrets

Agents and CLI users should avoid recording:

- API keys and tokens
- Passwords and session cookies
- Private keys and certificates
- Customer PII in event titles or summaries

Use `sortiri doctor` before sharing exports.

## Local data warning

`.sortiri/events.jsonl` may contain:

- File paths from your repository
- Command output from `sortiri run`
- Diffs attached as artifacts (cloud mode)

Treat the journal like source code. Set appropriate file permissions. Do not commit `config.json` (gitignored by default).

## Cloud sync warning

When cloud mode is enabled:

- Events ingest to your Sortiri Cloud workspace
- Integrations may pull GitHub, Stripe, PostHog, Slack, and observability data
- Review workspace access and RBAC before enabling in production

See [cloud.md](cloud.md).

## Reporting vulnerabilities

Do not open public issues for security bugs.

Use [GitHub Security Advisories](https://github.com/sortiri/sortiri/security/advisories/new) for private disclosure.

See [SECURITY.md](../SECURITY.md) at the repo root.

## Issues and PRs

Do not paste into public GitHub issues:

- `.sortiri/config.json`
- API keys or setup tokens
- Real workspace or project IDs
- Exported timelines with proprietary code

Use redacted, synthetic examples.

## Redaction

Cloud mode supports observability redaction and ingest validation where implemented. Local mode stores events as written — review before export.

## Enterprise controls

Teams evaluating Sortiri Cloud for production use can discuss security review support and enterprise controls with the Sortiri team. See [cloud.md](cloud.md).

## See also

- [local-first.md](local-first.md)
- [export.md](export.md)
- [github-org-privacy.md](github-org-privacy.md)
