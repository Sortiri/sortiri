# Testing

Sortiri uses **Vitest** for unit/API/CLI/SDK tests and **Playwright** for UI smoke tests.

## Quick start

```bash
# Terminal 1 — Convex backend
npx convex dev

# Terminal 2 — set Convex test mode (once per deployment)
npx convex env set SORTIRI_TEST_MODE true

# Terminal 3 — run unit tests only (no servers required)
npm run test:unit

# Full suite (requires dev server + Clerk test user for E2E)
export E2E_EMAIL="your-clerk-test-user@example.com"
export E2E_PASSWORD="your-password"
export NEXT_PUBLIC_CONVEX_URL="https://your-deployment.convex.cloud"
npm run test:all
```

## Commands

| Command | Description |
|---------|-------------|
| `npm test` | Unit + UI tests |
| `npm run test:unit` | Vitest (helpers, API logic, CLI, SDK) |
| `npm run test:ui` | Playwright smoke tests |
| `npm run test:all` | typecheck + lint + full test suite |
| `npm run test:unit:watch` | Vitest watch mode |

## Test layout

```
tests/
├── unit/          # Pure helper tests (event display, entities, authz, …)
├── api/           # Signature, ingest auth, CLI token helpers
├── cli/           # CLI init/config/run helpers
├── sdk/           # SDK client with mocked fetch
├── e2e/           # Playwright smoke specs
└── helpers/       # tempProject, seedTestData
```

## E2E authentication

Playwright `globalSetup` signs in via Clerk using `E2E_EMAIL` and `E2E_PASSWORD`, then saves `tests/e2e/.auth/user.json` (gitignored).

If those env vars are missing, UI tests are **skipped** (not failed) via `describeE2E` in `tests/e2e/helpers/auth.ts`.

## Test data seeding

With `SORTIRI_TEST_MODE=true` on your Convex deployment:

- `testSeed.seedTestWorkspace` — creates **Sortiri Test Workspace** with predictable titles (`Test Project Alpha`, `Test Workstream Replay`, `Test PR #42`, etc.)
- `testSeed.clearTestWorkspace` — removes the test workspace and related rows

Set test mode once:

```bash
npx convex env set SORTIRI_TEST_MODE true
```

## Legacy smoke scripts

These now delegate to Vitest:

- `npm run test:event-display`
- `npm run test:entity-extraction`
- `npm run test:project-scoping`
- `npm run test:github-webhook` (signature unit test)

Integration scripts that need a live stack remain as `tsx` scripts:

- `npm run test:cli-setup`
- `npm run test:cli-run`
