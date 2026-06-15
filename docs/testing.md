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

Playwright `globalSetup` signs in via Clerk using `E2E_EMAIL` and `E2E_PASSWORD`, then saves `tests/e2e/.auth/user.json` (gitignored). A second **member** user is provisioned when `E2E_MEMBER_EMAIL` is set; auth state is saved to `tests/e2e/.auth/member.json`. An **auditor** user uses `E2E_AUDITOR_EMAIL` → `tests/e2e/.auth/auditor.json`.

Credentials are loaded automatically from `tests/e2e/.env.e2e` when present (see `playwright.config.ts`).

Playwright runs three projects — `owner`, `member`, and `auditor` — so permission specs can assert role-specific behavior. Specs that are role-specific should skip when `testInfo.project.name` does not match.

### One-time setup with AgentMail

```bash
# Uses AgentMail inboxes for owner + member + auditor (sortiri-e2e / sortiri-e2e-member / sortiri-e2e-auditor)
export AGENTMAIL_API_KEY="am_us_..."
export CLERK_SECRET_KEY="sk_..."

npm run test:ui:setup
npm run test:ui
```

The setup script creates (or updates) Clerk users for both inboxes, syncs `CLERK_JWT_ISSUER_DOMAIN` and `SORTIRI_TEST_MODE` to your Convex deployment, and writes `tests/e2e/.env.e2e` with:

- `E2E_EMAIL` / `E2E_PASSWORD` — workspace owner
- `E2E_MEMBER_EMAIL` / `E2E_MEMBER_PASSWORD` — workspace member (Alpha-only project access after bootstrap)
- `E2E_AUDITOR_EMAIL` / `E2E_AUDITOR_PASSWORD` — external auditor (audits-only nav after bootstrap)

Playwright global setup signs in via `@clerk/testing/playwright` (server-side ticket, no OTP polling). The owner bootstrap seeds the test workspace (including **Test Project Beta**); the member bootstrap joins that workspace and receives Alpha-only access via `testSeed.bootstrapTestMember`; the auditor bootstrap uses `testSeed.bootstrapTestAuditor`.

For CI, set repository secrets:

- `E2E_EMAIL`
- `E2E_PASSWORD`
- `E2E_MEMBER_EMAIL` (optional but required for member permission specs)
- `E2E_MEMBER_PASSWORD` (optional; defaults to `E2E_PASSWORD`)
- `E2E_AUDITOR_EMAIL` (optional but required for auditor specs)
- `E2E_AUDITOR_PASSWORD` (optional; defaults to `E2E_PASSWORD`)
- `AGENTMAIL_API_KEY` (optional, only needed to re-run setup)

If owner env vars are missing, UI tests are **skipped** (not failed) via `describeE2E` in `tests/e2e/helpers/auth.ts`. Member-only assertions additionally require `E2E_MEMBER_EMAIL`. Auditor specs require `E2E_AUDITOR_EMAIL`.

### Agent sanity scripts

- `npx tsx scripts/sanity-project-access.ts` — Sprint 23 project access matrix
- `npx tsx scripts/sanity-audit-reports.ts` — Sprint 24 audit report + auditor mode flow
- `npx tsx scripts/sanity-evidence-safety.ts` — Sprint 25 sensitive evidence + redaction review flow
- `npx tsx scripts/sanity-audit-export-share.ts` — Sprint 26 audit export + secure share links
- `npx tsx scripts/sanity-stripe-integration.ts` — Sprint 27 Stripe webhook revenue ingestion

## Stripe integration (Sprint 27)

Required env vars (`.env.local` and Convex dashboard):

- `SORTIRI_SECRET_ENCRYPTION_KEY` — 32-byte key as base64 or hex (encrypts Stripe webhook secrets)
- `SORTIRI_INTEGRATION_SERVER_KEY` — server key for webhook route ↔ Convex calls (existing)

Local webhook tester:

```bash
WORKSPACE_ID=<workspace-external-id> \
WEBHOOK_SECRET=whsec_... \
npm run test:stripe-webhook
```

Optional: `API_URL=http://localhost:3000`, `EVENT_TYPE=payment_intent.succeeded`

Sanity script (requires local Next + Convex):

```bash
npx tsx scripts/sanity-stripe-integration.ts
```

## Test data seeding

With `SORTIRI_TEST_MODE=true` on your Convex deployment:

- `testSeed.seedTestWorkspace` — creates **Sortiri Test Workspace** with predictable titles (`Test Project Alpha`, `Test Project Beta`, `Test Workstream Replay`, `Test PR #42`, `Test PR Beta`, etc.)
- `testSeed.bootstrapTestMember` — joins the signed-in user to the test workspace as `member` with Alpha-only project access (call after owner seed)
- `testSeed.bootstrapTestAuditor` — joins as `auditor` with no project access
- `testSeed.seedAuditReportWithEvidence` — creates a finalized audit report (optional `auditorEmail` grants access)
- `testSeed.seedSensitiveArtifact` — creates an artifact with a fake secret (redacted by safety pipeline)
- `testSeed.seedBlockedArtifact` — creates a blocked artifact excluded from audit export
- `testSeed.seedAuditShareLink` — creates a share link for E2E/sanity (`rawToken`, `status`, optional `reportId`)
- `testSeed.seedStripeWebhookSecret` — saves encrypted test Stripe webhook secret for E2E/API tests
- `testSeed.seedStripeRevenueEvent` — inserts a sample Stripe revenue event
- `testSeed.seedMemberProjectAccess` — grants a specific project to a member by Clerk user id
- `testSeed.clearTestWorkspace` — removes the test workspace and related rows (including audit reports, `projectAccess`, and `savedViews`)

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
