#!/usr/bin/env tsx
/**
 * Sprint 37 journal backup drill — verify local journal durability and replay refs.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { buildEnvelope } from "../src/lib/reliability/eventEnvelope";
import { getJournalRoot, LocalIngestJournal } from "../src/lib/reliability/localJournal";

loadEnvFile(".env.local");

async function selfTest(): Promise<void> {
  const workspaceId = `backup-drill-${Date.now()}`;
  const journal = new LocalIngestJournal();
  const envelope = buildEnvelope({
    workspaceId,
    source: "cli",
    sourceEventId: `backup-${Date.now()}`,
    payload: {
      source: "cli",
      category: "system_event",
      type: "backup_drill",
      actor: { type: "system", name: "Backup Drill" },
      title: "Journal backup drill",
    },
  });

  const written = await journal.write({ ...envelope, status: "journaled" });
  const filePath = path.join(getJournalRoot(), written.journalRef);
  const onDisk = await fs.readFile(filePath, "utf8");
  if (!onDisk.includes(envelope.envelopeId)) {
    throw new Error("Journal file missing envelope id");
  }

  const readBack = await journal.read(written.journalRef);
  if (readBack.envelopeId !== envelope.envelopeId) {
    throw new Error("Journal read-back mismatch");
  }

  await fs.rm(path.join(getJournalRoot(), workspaceId), { recursive: true, force: true });
  console.log("[PASS] journal backup drill: write/read verified");
}

async function main() {
  const selfTestOnly = process.argv.includes("--self-test");
  if (selfTestOnly) {
    await selfTest();
    return;
  }

  await selfTest();
  console.log("Backup drill complete — local journal durable write/read OK");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
