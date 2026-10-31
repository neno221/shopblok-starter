/**
 * The Medusa → Payload sync's shapes (T60, D75; the markets part went with T75, D95), shared by the backend (which writes them),
 * the storefront's import (which reads them) and bootstrap (which reports the import's counts).
 * Types only: the backend is CommonJS and `scripts/` runs under plain Node, so neither loads this
 * package at runtime. `documents.json` beside it is the data both sides' tests read.
 */

export type SyncCollection = "products" | "categories" | "collections";

/** One document: the synced fields, and the references to other documents by Medusa id. */
export type SyncDocument = {
  fields: { medusaId: string } & Record<string, unknown>;
  references: Record<string, string | null>;
};

/** What `export-for-payload.ts` writes and `import-from-medusa.ts` reads (bootstrap step 10). */
export type SyncExport = {
  exportedAt: string;
  documents: Record<SyncCollection, SyncDocument[]>;
};

/** What `import-from-medusa.ts` prints as `{"importFromMedusa":…}`. */
export type ImportCounts = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
};
