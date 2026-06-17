import type { IngestEventEnvelope } from "./eventEnvelope";
import type { IngestJournal, JournalListEntry, JournalWriteResult } from "./journal";

/**
 * S3/R2-compatible journal adapter — interface-ready for future production use.
 * Not required for Sprint 37 tests; configure SORTIRI_JOURNAL_PROVIDER=s3|r2 when ready.
 */
export class ObjectStorageIngestJournal implements IngestJournal {
  constructor() {
    const bucket = process.env.SORTIRI_JOURNAL_BUCKET;
    const provider = process.env.SORTIRI_JOURNAL_PROVIDER;
    if (!bucket || !provider || provider === "local") {
      throw new Error(
        "Object storage journal requires SORTIRI_JOURNAL_PROVIDER=s3|r2 and SORTIRI_JOURNAL_BUCKET",
      );
    }
    const region = process.env.SORTIRI_JOURNAL_REGION;
    const endpoint = process.env.SORTIRI_JOURNAL_ENDPOINT;
    const accessKey = process.env.SORTIRI_JOURNAL_ACCESS_KEY_ID;
    const secretKey = process.env.SORTIRI_JOURNAL_SECRET_ACCESS_KEY;
    if (!region || !accessKey || !secretKey) {
      throw new Error(
        "Object storage journal requires SORTIRI_JOURNAL_REGION, SORTIRI_JOURNAL_ACCESS_KEY_ID, and SORTIRI_JOURNAL_SECRET_ACCESS_KEY",
      );
    }
    if (!endpoint && provider === "r2") {
      throw new Error("R2 journal requires SORTIRI_JOURNAL_ENDPOINT");
    }
  }

  async write(_envelope: IngestEventEnvelope): Promise<JournalWriteResult> {
    throw new Error(
      "Object storage journal write is not implemented in Sprint 37 — use local adapter",
    );
  }

  async read(_journalRef: string): Promise<IngestEventEnvelope> {
    throw new Error(
      "Object storage journal read is not implemented in Sprint 37 — use local adapter",
    );
  }

  async list(_params: {
    workspaceId: string;
    source?: string;
    from?: number;
    to?: number;
    limit?: number;
  }): Promise<JournalListEntry[]> {
    throw new Error(
      "Object storage journal list is not implemented in Sprint 37 — use local adapter",
    );
  }
}
