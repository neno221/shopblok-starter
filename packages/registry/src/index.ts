import { atoms } from "./entries/atoms";
import { foundations } from "./entries/foundations";
import {
  GROUPS,
  type EntryInput,
  type Group,
  type RegistryEntry,
  type VariantOption,
} from "./types";

// The registry (D40): every entry of the design system as data, with no React, so the DS page, its
// Playwright checks, the thumbnail run (D52) and M4's Payload config (which its CLI loads outside
// Next) read one list. What the DS page says about an entry (its summary, a11y notes, live render
// and states) is a story in the storefront, keyed by the entry's id. A new entry is one object in
// `entries/`; SETUP.md, "How to add an entry", has the rest.

export { GROUPS };
export type { ComponentRef, EntryInput, Group, Kind, RegistryEntry, VariantOption } from "./types";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Checks the entries and derives each family member's thumbnail. It throws on the first problem, so
 * a duplicate id or a malformed entry fails every test and build that loads the registry.
 */
export function defineEntries(input: readonly EntryInput[]): readonly RegistryEntry[] {
  const ids = new Set<string>();
  const variants = new Set<string>();
  return input.map((entry) => {
    const [group, slug, ...rest] = entry.id.split("/");
    if (group !== entry.group || slug === undefined || rest.length > 0 || !slugPattern.test(slug))
      throw new Error(
        `registry: "${entry.id}" is not "${entry.group}/{slug}" with a kebab-case slug.`,
      );
    if (ids.has(entry.id)) throw new Error(`registry: "${entry.id}" is listed twice.`);
    ids.add(entry.id);
    if (entry.label.trim() === "") throw new Error(`registry: "${entry.id}" has no label.`);
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

/** Every entry, in the navigation's order: the groups in `GROUPS` order, each in its file's. */
export const entries = defineEntries([...foundations, ...atoms]);

/** The id of an entry of the registry, as a type: a story keyed by anything else is an error. */
export type EntryId = (typeof foundations)[number]["id"] | (typeof atoms)[number]["id"];

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

/** What M4's Payload pickers list for `family` (D46): each variant's value, label and thumbnail. */
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
