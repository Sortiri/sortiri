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

# Full suite (starts Convex + Next for E2E automatically via Playwright)
export E2E_EMAIL="your-clerk-test-user@example.com"
export E2E_PASSWORD="your-password"
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

Credentials are loaded automatically from `tests/e2e/.env.e2e` when present (see `playwright.config.ts`).

### One-time setup with AgentMail

```bash
# Uses an existing AgentMail inbox (or the first available inbox on the account)
export AGENTMAIL_API_KEY="am_us_..."
export CLERK_SECRET_KEY="sk_..."

npm run test:ui:setup
npm run test:ui
```

The setup script creates (or updates) a Clerk user for the AgentMail inbox, syncs `CLERK_JWT_ISSUER_DOMAIN` and `SORTIRI_TEST_MODE` to your Convex deployment, and writes `tests/e2e/.env.e2e`.

Playwright global setup signs in via `@clerk/testing/playwright` (server-side ticket, no OTP polling) and bootstraps onboarding plus test seed data before saving auth state.

For CI, set repository secrets:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `AGENTMAIL_API_KEY` (optional, only needed to re-run setup)

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
