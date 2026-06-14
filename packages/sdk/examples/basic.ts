import { Sortiri } from "../src/index.js";

const apiUrl = process.env.SORTIRI_API_URL ?? "http://localhost:3000";
const apiKey = process.env.SORTIRI_API_KEY ?? process.env.SORTIRI_DEV_INGEST_KEY;
const workspaceId = process.env.SORTIRI_WORKSPACE_ID;

if (!apiKey) {
  throw new Error("Set SORTIRI_API_KEY (create one on the Sources page) or SORTIRI_DEV_INGEST_KEY");
}

const sortiri = new Sortiri({
  apiUrl,
  apiKey,
  ...(workspaceId ? { workspaceId } : {}),
});

const trackResult = await sortiri.track({
  type: "user.signed_up",
  userId: "user_123",
  properties: {
    plan: "free",
    source: "twitter",
  },
});
console.log("track:", trackResult);

const decisionResult = await sortiri.decision({
  title: "Changed onboarding CTA",
  summary: "Decided to change the CTA from Start free to Create timeline.",
  actorName: "Bobby",
  tags: ["onboarding", "pricing"],
});
console.log("decision:", decisionResult);

const revenueResult = await sortiri.revenue({
  type: "payment.received",
  title: "Payment received",
  amount: 29,
  currency: "USD",
  customerId: "cus_123",
});
console.log("revenue:", revenueResult);
