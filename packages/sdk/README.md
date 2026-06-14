# Sortiri SDK

Record product events, revenue events, and company decisions into your Sortiri timeline.

## Install

This package lives in the Sortiri monorepo workspace:

```bash
npm install @sortiri/sdk
```

For local development, add `"@sortiri/sdk": "*"` to your app dependencies.

## Initialize

```ts
import { Sortiri } from "@sortiri/sdk";

const sortiri = new Sortiri({
  apiUrl: process.env.SORTIRI_API_URL!,
  apiKey: process.env.SORTIRI_API_KEY!,
  // Optional when using workspace API keys (workspace is resolved from the key):
  workspaceId: process.env.SORTIRI_WORKSPACE_ID,
  projectId: process.env.SORTIRI_PROJECT_ID,
});
```

## Track a product event

```ts
await sortiri.track({
  type: "user.signed_up",
  userId: "user_123",
  properties: {
    plan: "free",
    source: "twitter",
  },
});
```

## Record a company decision

```ts
await sortiri.decision({
  title: "Changed onboarding CTA",
  summary: "Decided to change the CTA from Start free to Create timeline.",
  actorName: "Bobby",
  tags: ["onboarding", "pricing"],
});
```

## Record a revenue event

```ts
await sortiri.revenue({
  type: "payment.received",
  title: "Payment received",
  amount: 29,
  currency: "USD",
  customerId: "cus_123",
});
```

## Generic event

```ts
await sortiri.event({
  category: "product_event",
  type: "feature.used",
  actor: { type: "customer", id: "user_123" },
  title: "Feature used",
  data: { feature: "timeline_search" },
});
```

## Environment variables

| Variable | Purpose |
|---|---|
| `SORTIRI_API_URL` | Sortiri app URL (e.g. `http://localhost:3000`) |
| `SORTIRI_API_KEY` | Ingest API key (same as `SORTIRI_DEV_INGEST_KEY` in dev) |
| `SORTIRI_WORKSPACE_ID` | Workspace external ID (UUID string) |
| `SORTIRI_PROJECT_ID` | Optional Convex project ID |

## Examples

```bash
npx tsx packages/sdk/examples/basic.ts
```
