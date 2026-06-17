# Troubleshooting — Sortiri open source

Local-first troubleshooting for CLI, MCP, and the local timeline viewer.

## `npx sortiri` / `sortiri` command not found

- Install Node.js 20+ (`node --version`)
- From monorepo dev: `npx tsx packages/cli/src/index.ts init`
- Before npm publish, use publish-equivalent flow:

```bash
cd packages/cli && npm pack
npm exec --package ./sortiri-0.1.0.tgz sortiri -- init --yes
```

Real `npx sortiri init` from the npm registry is not available until the package is published.

## Node version issues

Sortiri requires Node.js 20 or newer. Upgrade with `nvm install 22` or your system package manager.

## MCP config not detected

1. Run `sortiri init --yes` in your repo root
2. Confirm `.cursor/mcp.json` exists with `npx sortiri mcp`
3. Restart the Sortiri MCP server in Cursor (Settings → MCP)
4. Set `SORTIRI_CONFIG_PATH` to `.sortiri/config.json` if using a custom config path

## Cursor rules not installed

- Re-run `sortiri init --yes`
- Check `.cursor/rules/sortiri.mdc` exists
- Copy from `examples/cursor/sortiri.mdc` if needed

## `sortiri dev` — port already in use

Default port is `4317`. Use another port:

```bash
sortiri dev --port 4318
```

Stop the other process or change the port in your workflow.

## Empty timeline

- Run `sortiri record --type agent.action --title "Test event"`
- Check `.sortiri/events.jsonl` has lines
- Confirm you are in the repo root where `sortiri init` ran

## Export file missing

```bash
sortiri export --out timeline.jsonl
ls -la timeline.jsonl
```

Default export writes to stdout if `--out` is omitted.

## `npm pack` flow fails

```bash
cd packages/cli
npm pack
ls sortiri-*.tgz
```

Use the exact tarball name with `npm exec --package ./sortiri-*.tgz sortiri -- init --yes`.

## Package not published yet

The `sortiri` npm package may not be on the public registry yet. Use:

- Monorepo: `npx tsx packages/cli/src/index.ts`
- Tarball: `npm pack` + `npm exec --package`
- Demo: `npm run demo:oss`

## Doctor failures

```bash
sortiri doctor
```

Common fixes:
- Re-run `sortiri init --yes`
- Ensure `.sortiri/config.json` has `"mode": "local"`
- For cloud mode, verify API key and workspace ID

## Still stuck?

- [Quickstart](quickstart.md)
- [CLI reference](cli.md)
- [GitHub issues](https://github.com/sortiri/sortiri/issues)

Local mode never requires cloud login, Convex, Clerk, Stripe, PostHog, or GitHub tokens.
