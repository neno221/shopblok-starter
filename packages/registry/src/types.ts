import type { z } from "zod";

/**
 * The groups of the DS navigation, in SPEC §9.6's order: the ones M2 and M3 fill. Sections join
 * before Templates when M5 builds its first entry; SPEC §9.3's "Pages" are the app itself (D56).
 */
export const GROUPS = [
  "foundations",
  "atoms",
  "molecules",
  "organisms",
  "headers-footers",
  "templates",
] as const;
export type Group = (typeof GROUPS)[number];

/**
 * What an entry is, which its group does not always say: the headers and footers are organisms in
 * a group of their own.
 */
export type Kind = "foundation" | "atom" | "molecule" | "organism" | "template";

/** The `@shopblok/ui` export an entry renders: its module, as an import path, and its name. */
export type ComponentRef = { module: `@shopblok/ui/${string}`; name: string };

/** An entry as it is written in `entries/` (D40); `defineEntries` checks it and derives the rest. */
export type EntryInput = {
  /** `{group}/{slug}`, the DS path: a kebab-case slug of lowercase letters and digits. */
  id: string;
  group: Group;
  kind: Kind;
  /** The navigation label and the page title. The DS chrome is English (D33). */
  label: string;
  /** Not for a foundation, which documents tokens and renders no component of its own. */
  component?: ComponentRef;
  /**
   * The variants a shop picks (D46) share a family (`header`, `footer`, `product-card`); `variant`
   * is the value a Payload picker stores (M4), unique in its family. Both or neither.
   */
  family?: string;
  variant?: string;
  /** The props an entry shows, as a zod schema of its view model (D41); none in M1's entries. */
  contract?: z.ZodType;
};

/** An entry of the registry: as written, with the thumbnail of a family member (D52). */
export type RegistryEntry = EntryInput & {
  /** `/registry/{id}.png` under the storefront's `public/`, for an entry with a family only. */
  thumbnail?: `/registry/${string}.png`;
};

/** What a Payload picker lists for one variant of a family (M4). */
export type VariantOption = { value: string; label: string; thumbnail: string };
