import type { CollectionSlug, GlobalSlug, Payload } from "payload";
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
 * One global's part of the seed (T61: `header`, `footer`, `site-settings`). Each value is at a
 * field's path (`announcement.message`) and in the shape Payload's `locale: "all"` read gives it:
 * a localized value as `{ en: …, el: … }`, also inside arrays (`[{ title: { en: "Shop" } }]`).
 * A global is published when the seed first writes it.
 */
export type SeedGlobal = {
  global: GlobalSlug;
  fields: (payload: Payload) => Record<string, Seeded> | Promise<Record<string, Seeded>>;
  /**
   * Paths of localized arrays (`productNotes`): their `{ en: […], el: […] }` value is written one
   * language at a time, since Payload 3.92.1's `locale: "all"` write validates a localized array
   * as a whole object and refuses it.
   */
  perLocale?: readonly string[];
};

/**
 * What a run did. `kept` names the documents (`pages:home`) the seed had changes for but left
 * alone, because an editor has an unpublished draft newer than the published text (`runSeeds`).
 */
export type SeedCounts = { created: number; updated: number; unchanged: number; kept: string[] };
