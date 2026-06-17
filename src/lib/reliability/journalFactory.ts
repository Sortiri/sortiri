import type { IngestJournal } from "./journal";
import { LocalIngestJournal } from "./localJournal";
import { ObjectStorageIngestJournal } from "./objectStorageJournal";

let journalInstance: IngestJournal | null = null;

export function getJournal(): IngestJournal {
  if (journalInstance) {
    return journalInstance;
  }

  const provider = process.env.SORTIRI_JOURNAL_PROVIDER ?? "local";
  if (provider === "s3" || provider === "r2") {
    journalInstance = new ObjectStorageIngestJournal();
  } else {
    journalInstance = new LocalIngestJournal();
  }
  return journalInstance;
}

/** Reset singleton — for tests */
export function resetJournalForTests(): void {
  journalInstance = null;
}
