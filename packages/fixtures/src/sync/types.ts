/**
 * The Medusa → Payload sync's shapes (T60, D75, D76), shared by the backend (which writes them),
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

/** The `markets` global's synced part (D76): Medusa's regions and the store's settings. */
export type SyncedMarkets = {
  regions: { medusaId: string; name: string; currency: string; countries: string[] }[];
  currencies: string[];
  defaultCurrency: string | null;
  locales: string[];
};

/** What `export-for-payload.ts` writes and `import-from-medusa.ts` reads (bootstrap step 10). */
export type SyncExport = {
  exportedAt: string;
  documents: Record<SyncCollection, SyncDocument[]>;
  markets: SyncedMarkets;
};

/** What `import-from-medusa.ts` prints as `{"importFromMedusa":…}`. */
export type ImportCounts = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  markets: "updated" | "unchanged";
};
