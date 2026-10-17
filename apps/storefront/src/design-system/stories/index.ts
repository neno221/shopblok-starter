import type { EntryId } from "@shopblok/registry";
import type { DsStory } from "../types";
import { atomStories } from "./atoms";
import { commerceAtomStories } from "./atoms-commerce";
import { foundationStories } from "./foundations";
import { productMoleculeStories } from "./molecules-product";
import { productCardStories } from "./molecules-product-card";

// What the DS page says about each registry entry (D40): its summary, a11y notes, live render and
// states, keyed by the entry's id. Each file's object is checked against the registry's ids
// (`satisfies Partial<Record<EntryId, DsStory>>`), so a story for an id the registry does not have
// is a type error there; this one wants a story for every id, so a missing story is a type error
// here. `stories.test.tsx` checks both at run time.
export const stories: Record<EntryId, DsStory> = {
  ...foundationStories,
  ...atomStories,
  ...commerceAtomStories,
  ...productCardStories,
  ...productMoleculeStories,
};
