import { atoms } from "./entries/atoms";
import { foundations } from "./entries/foundations";
import { headersFooters } from "./entries/headers-footers";
import { molecules } from "./entries/molecules";
import { organisms } from "./entries/organisms";
import { sections } from "./entries/sections";
import { templates } from "./entries/templates";
import {
  GROUPS,
  type EntryInput,
  type Group,
  type RegistryEntry,
  type VariantOption,
} from "./types";

// The registry (D40): every entry of the design system as data, with no React, so the DS page, its
// Playwright checks, the thumbnail run (D52) and the Payload config (which its CLI loads outside
// Next) read one list. What the DS page says about an entry (its summary, a11y notes, live render
// and states) is a story in the storefront, keyed by the entry's id. A new entry is one object in
// `entries/`; SETUP.md, "How to add an entry", has the rest.

export { GROUPS };
export type { ComponentRef, EntryInput, Group, Kind, RegistryEntry, VariantOption } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** A Payload block's slug (`richText`): camelCase, as Payload's own block slugs are. */
const blockPattern = /^[a-z][a-zA-Z0-9]*$/;

/**
 * Checks the entries and derives each family member's thumbnail. It throws on the first problem, so
 * a duplicate id or a malformed entry fails every test and build that loads the registry.
 */
export function defineEntries(input: readonly EntryInput[]): readonly RegistryEntry[] {
  const ids = new Set<string>();
  const variants = new Set<string>();
  // A block is one family (D79): M5's variants of a block are more members of its family.
  const familyOfBlock = new Map<string, string>();
  const blockOfFamily = new Map<string, string>();
  return input.map((entry) => {
    const [group, slug, ...rest] = entry.id.split("/");
    if (group !== entry.group || slug === undefined || rest.length > 0 || !slugPattern.test(slug))
      throw new Error(
        `registry: "${entry.id}" is not "${entry.group}/{slug}" with a kebab-case slug.`,
      );
    if (ids.has(entry.id)) throw new Error(`registry: "${entry.id}" is listed twice.`);
    ids.add(entry.id);
    if (entry.label.trim() === "") throw new Error(`registry: "${entry.id}" has no label.`);
    if ((entry.group === "sections") !== (entry.block !== undefined))
      throw new Error(
        `registry: "${entry.id}": a section names its Payload block, and only a section.`,
      );
    if (entry.block !== undefined) {
      if (!blockPattern.test(entry.block))
        throw new Error(
          `registry: "${entry.id}": the block "${entry.block}" is not a camelCase slug.`,
        );
      if (entry.family === undefined)
        throw new Error(`registry: "${entry.id}": a section is a family member (D79).`);
      const family = familyOfBlock.get(entry.block) ?? entry.family;
      const block = blockOfFamily.get(entry.family) ?? entry.block;
      if (family !== entry.family || block !== entry.block)
        throw new Error(
          `registry: "${entry.id}": the block "${entry.block}" and the family "${entry.family}" belong to other sections.`,
        );
      familyOfBlock.set(entry.block, entry.family);
      blockOfFamily.set(entry.family, entry.block);
    }
    if ((entry.family === undefined) !== (entry.variant === undefined))
      throw new Error(`registry: "${entry.id}" needs both a family and a variant, or neither.`);
    if (entry.family === undefined) return entry;
    const key = `${entry.family}/${entry.variant}`;
    if (variants.has(key))
      throw new Error(`registry: the variant "${key}" is listed twice ("${entry.id}").`);
    variants.add(key);
    return { ...entry, thumbnail: `/registry/${entry.id}.png` as const };
  });
}

// The entry files, in the navigation's order. `entries` and `EntryId` both come from this one list,
// so a new file added here is in both (PR 51 review, item 4).
const all = [
  ...foundations,
  ...atoms,
  ...molecules,
  ...organisms,
  ...headersFooters,
  ...sections,
  ...templates,
] as const;

/** The id of an entry of the registry, as a type: a story keyed by anything else is an error. */
export type EntryId = (typeof all)[number]["id"];

/** Every entry, in the navigation's order: the groups in `GROUPS` order, each in its file's. */
export const entries = defineEntries(all) as readonly (RegistryEntry & { id: EntryId })[];

/** The entries of `group`, in order. */
export function byGroup(group: Group, list: readonly RegistryEntry[] = entries): RegistryEntry[] {
  return list.filter((entry) => entry.group === group);
}

/** The entry with `id` (`atoms/button`), or `undefined`. */
export function findEntry(
  id: string,
  list: readonly RegistryEntry[] = entries,
): RegistryEntry | undefined {
  return list.find((entry) => entry.id === id);
}

/** The Sections entries, one per Payload block (D70), in the navigation's order. */
export function sectionEntries(list: readonly RegistryEntry[] = entries): RegistryEntry[] {
  return list.filter((entry) => entry.block !== undefined);
}

/** What the Payload pickers list for `family` (D46): each variant's value, label and thumbnail. */
export function variantsOf(
  family: string,
  list: readonly RegistryEntry[] = entries,
): VariantOption[] {
  return list.flatMap((entry) =>
    entry.family === family && entry.variant !== undefined && entry.thumbnail !== undefined
      ? [{ value: entry.variant, label: entry.label, thumbnail: entry.thumbnail }]
      : [],
  );
}
