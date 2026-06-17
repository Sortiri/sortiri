#!/usr/bin/env tsx
/**
 * Replay pending ingest deliveries from the Convex-backed journal.
 */

import { parseArgs } from "node:util";
import { loadEnvFile } from "node:process";
import { api } from "../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Id } from "../convex/_generated/dataModel";

loadEnvFile(".env.local");

function getDevIngestKey(): string {
  const key = process.env.SORTIRI_DEV_INGEST_KEY;
  if (!key) throw new Error("Missing SORTIRI_DEV_INGEST_KEY");
  return key;
}

async function selfTest() {
  console.log("[PASS] replay-ingest-journal self-test: module loads");
  return true;
}

async function main() {
  const { values } = parseArgs({
    options: {
      workspace: { type: "string" },
      delivery: { type: "string" },
      "dead-letter": { type: "string" },
      "self-test": { type: "boolean" },
    },
  });

  if (values["self-test"]) {
    await selfTest();
    return;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("Missing NEXT_PUBLIC_CONVEX_URL");
  const convex = new ConvexHttpClient(convexUrl);
  const ingestKey = getDevIngestKey();

  if (!values.workspace) {
    throw new Error("--workspace is required");
  }

  let deliveryId = values.delivery as Id<"ingestDeliveries"> | undefined;

  if (values["dead-letter"]) {
    const deadLetter = await convex.query(api.reliabilityIngest.getDeadLetterForIngest, {
      ingestKey,
      workspaceId: values.workspace,
      deadLetterId: values["dead-letter"] as Id<"ingestDeadLetters">,
    });
    if (!deadLetter?.deliveryId) {
      throw new Error("Dead letter has no linked delivery");
    }
    deliveryId = deadLetter.deliveryId;
  }

  if (!deliveryId) {
    throw new Error("--delivery or --dead-letter with linked delivery is required");
  }

  const result = await convex.mutation(api.reliabilityIngest.replayDeliveryForIngest, {
    ingestKey,
    workspaceId: values.workspace,
    deliveryId,
  });
  console.log(JSON.stringify(result, null, 2));
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
