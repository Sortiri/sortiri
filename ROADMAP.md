# Sortiri Roadmap

Sortiri is local-first today. Managed cloud is the upgrade path for teams.

## Now — Open source, local-first (v0.1)

- [x] CLI: `init`, `doctor`, `dev`, `record`, `export`, `mcp`
- [x] Local JSONL event journal (`.sortiri/events.jsonl`)
- [x] Local timeline viewer (`sortiri dev`)
- [x] Cursor MCP config and agent rules
- [x] Portable event schema and JSONL export
- [x] Apache-2.0 license and GitHub org launch assets

## Next — Local experience

- [ ] npm publish for `npx sortiri init` without monorepo checkout
- [ ] Richer local replay (workstream grouping, artifact previews)
- [ ] Improved MCP local-mode tool coverage
- [ ] Demo project and example timelines
- [ ] Additional agent editor support (Claude Code, Codex)

## Later — Sortiri Cloud (managed upgrade)

Sortiri Cloud adds team features when you need them:

- Hosted team workspaces and shared timelines
- Managed retention and source health
- Audit evidence rooms and redaction workflows
- RBAC and SSO
- Reliability monitoring (ingest journal, replay, dead letters)
- Enterprise support

Cloud is optional. Local mode remains fully functional without an account.

## How to influence the roadmap

- Open a [feature request](https://github.com/sortiri/sortiri/issues/new?template=feature_request.md)
- Comment on existing issues
- Contribute — see [CONTRIBUTING.md](CONTRIBUTING.md)
