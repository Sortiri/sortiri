# Good first issues — copy into GitHub

Create issues manually, or run with `CREATE_GITHUB_ISSUES=true` when automation is wired.

---

## 1. Add a new event type example

**Labels:** `documentation`, `good first issue`

Add a documented example for `product.event` in `docs/event-schema.md` and a sample line in `examples/demo-agent-project/.sortiri/events.jsonl`.

---

## 2. Improve Cursor setup docs

**Labels:** `documentation`, `good first issue`

Expand `docs/cursor.md` with screenshots or step-by-step for enabling the Sortiri MCP server in Cursor settings.

---

## 3. Add Claude Code setup docs

**Labels:** `documentation`, `good first issue`

Create `docs/claude-code.md` with MCP config and agent rules for Claude Code users.

---

## 4. Add Codex setup docs

**Labels:** `documentation`, `good first issue`

Create `docs/codex.md` with setup instructions for OpenAI Codex or compatible agents.

---

## 5. Add terminal theme support to local timeline

**Labels:** `enhancement`, `good first issue`

Add a `--theme light|dark` flag to `sortiri dev` and document it in `docs/cli.md`.

---

## 6. Add JSONL validation command

**Labels:** `enhancement`, `good first issue`

Add `sortiri validate` to check `.sortiri/events.jsonl` for schema errors and report line numbers.

---

## 7. Add shell completion docs

**Labels:** `documentation`, `good first issue`

Document bash/zsh/fish completion setup for the Sortiri CLI in `docs/cli.md`.

---

## 8. Add sample incident event

**Labels:** `documentation`, `good first issue`

Add an `incident.resolved` example to `docs/event-schema.md` with metadata for severity and service.

---

## 9. Add sample rollback event

**Labels:** `documentation`, `good first issue`

Expand rollback documentation with a before/after version metadata example in `docs/event-schema.md`.

---

## 10. Improve troubleshooting for MCP

**Labels:** `documentation`, `good first issue`

Add MCP-specific troubleshooting (server not listed, env vars, restart steps) to `docs/troubleshooting.md`.
