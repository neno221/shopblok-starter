import type { CollectionSlug, Payload } from "payload";
import type { Seeded } from "./values";

/** A document the seed owns, found again by its `seedKey`. */
export type SeedDocument = {
  key: string;
  /** Fields in every language: `{ title: { en: { value: "Home" }, el: { value: "Αρχική" } } }`. */
  localized: Record<string, Record<string, Seeded>>;
  /** Fields with one value for all languages. */
  shared?: Record<string, Seeded>;
  /** Published when the seed creates it; after that, publishing is the editor's call. */
  publish: boolean;
};

/** One content type's part of the seed (T59: `pages`; later tasks add theirs). */
export type SeedModule = {
  collection: CollectionSlug;
  documents: (payload: Payload) => SeedDocument[] | Promise<SeedDocument[]>;
};

/**
 * What a run did. `kept` names the documents (`pages:home`) the seed had changes for but left
 * alone, because an editor has an unpublished draft newer than the published text (`runSeeds`).
 */
export type SeedCounts = { created: number; updated: number; unchanged: number; kept: string[] };
