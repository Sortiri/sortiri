# Contributing to Sortiri

Thank you for helping make Sortiri a better timeline layer for AI-native companies.

## Getting started

1. Fork [github.com/sortiri/sortiri](https://github.com/sortiri/sortiri)
2. Clone your fork locally
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b your-feature-branch`

## Development workflow

Sortiri is a monorepo. Key packages:

| Package | Path |
|---------|------|
| CLI | `packages/cli` |
| MCP server | `packages/mcp` |
| Local storage | `packages/sortiri-local` |

For local CLI development without publishing:

```bash
npm run sortiri:init
npm run sortiri:dev
```

Or run the CLI directly:

```bash
npx tsx packages/cli/src/index.ts init --yes
npx tsx packages/cli/src/index.ts doctor
```

## Testing

Before opening a pull request, run:

```bash
npm run typecheck
npm run lint
npm run test:unit
```

For broader validation:

```bash
npm run test:all
npm run assert:no-landing-changes
npm run assert:no-next-backend-routes
```

When working on open-source launch assets:

```bash
npm run sanity:open-source-project
```

Prefer wrapping validation commands with Sortiri when recording work:

```bash
sortiri run -- npm run test:unit
```

## Pull request guidelines

- Keep changes focused and local-first compatible
- Do not commit secrets, API keys, or real workspace IDs
- Update docs when changing CLI behavior or event schema
- Fill out the PR template checklist

## Landing page guard

**Do not modify landing or marketing pages** unless the sprint or issue explicitly requires it.

Guarded paths (enforced by `npm run assert:no-landing-changes`):

- `src/app/page.tsx`
- `src/app/landing.css`
- `src/app/pricing/`
- `src/components/landing/`
- `src/components/pricing/`
- `src/lib/landing-fonts.ts`

If your change touches these paths, explain why in the PR or revert before merging.

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Be respectful and constructive.

## Questions

Open a [GitHub issue](https://github.com/sortiri/sortiri/issues) for bugs, features, or docs questions.

See also [docs/contributing.md](docs/contributing.md).
