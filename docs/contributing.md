# Contributing

This page supplements [CONTRIBUTING.md](../CONTRIBUTING.md) at the repo root.

## Quick links

- [Repository](https://github.com/sortiri/sortiri)
- [Issues](https://github.com/sortiri/sortiri/issues)
- [Security reporting](../SECURITY.md)
- [Code of conduct](../CODE_OF_CONDUCT.md)

## Focus areas

We welcome contributions in:

- Local-first CLI and MCP improvements
- Documentation and examples
- Event schema and export tooling
- Tests and sanity scripts
- Bug fixes

## Local development

```bash
git clone https://github.com/sortiri/sortiri.git
cd sortiri
npm install
npx tsx packages/cli/src/index.ts init --yes
npx tsx packages/cli/src/index.ts doctor
```

## Test before PR

```bash
npm run typecheck
npm run lint
npm run test:unit
npm run assert:no-landing-changes
```

## Landing page guard

Do not modify marketing/landing files unless explicitly required. See [CONTRIBUTING.md](../CONTRIBUTING.md#landing-page-guard).

## Docs contributions

When changing CLI behavior:

1. Update [cli.md](cli.md)
2. Update [quickstart.md](quickstart.md) if the default flow changes
3. Update root [README.md](../README.md) if positioning changes

Trust rules for all docs:

- No real API keys or workspace IDs
- No personal emails
- No fake GitHub stars
- No SOC 2 or compliance-ready claims

## Issue templates

Use GitHub issue templates for bugs, features, and docs issues.

## License

Contributions are licensed under Apache-2.0. See [LICENSE](../LICENSE).
