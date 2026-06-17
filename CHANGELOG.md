# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-06-17

### Added

- Open-source launch under [github.com/sortiri/sortiri](https://github.com/sortiri/sortiri)
- Apache-2.0 license
- Local-first CLI: `init`, `doctor`, `dev`, `record`, `export`, `mcp`
- Local event journal (`.sortiri/events.jsonl`) with canonical event schema
- Local timeline viewer (`sortiri dev` on `http://127.0.0.1:4317`)
- Portable Cursor MCP config (`npx sortiri mcp`)
- Cursor agent rules (`.cursor/rules/sortiri.mdc`)
- OSS documentation: quickstart, CLI, MCP, event schema, security, export
- Community files: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, ROADMAP
- Landing page change guard (`assert:no-landing-changes`)

### Notes

- Local mode is the default — no Sortiri Cloud account required
- Cloud sync remains available via setup token for teams
- npm publish planned separately; install from repo or `npm pack` for now

[0.1.0]: https://github.com/sortiri/sortiri/releases/tag/v0.1.0
