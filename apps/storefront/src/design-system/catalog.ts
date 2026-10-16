import { LOCALES, type Locale } from "@shopblok/i18n";
import { entries as manifest } from "./entries";
import type { DsEntry, DsGroupId } from "./types";

/** The groups in navigation order, with their English labels in `catalogs.en.designSystem.groups`. */
export const GROUPS: readonly DsGroupId[] = ["foundations", "atoms"];

/** An entry's id as the route's `[...entry]` segments. */
export function entrySegments(entry: DsEntry): string[] {
  return entry.id.split("/");
}

/** The entry at `segments` (the `[...entry]` param), or `undefined`: the page answers 404. */
export function findEntry(
  segments: readonly string[],
  entries: readonly DsEntry[] = manifest,
): DsEntry | undefined {
  const id = segments.join("/");
  return entries.find((entry) => entry.id === id);
}

/** The groups that have entries, in order, each with its entries in manifest order. */
export function navigation(
  entries: readonly DsEntry[] = manifest,
): { group: DsGroupId; entries: DsEntry[] }[] {
  return GROUPS.map((group) => ({
    group,
    entries: entries.filter((entry) => entry.group === group),
  })).filter((section) => section.entries.length > 0);
}

/**
 * The params of every page and every frame: each entry in each of the four locales. The routes'
 * `generateStaticParams` return exactly this (Cache Components wants every param of a static route
 * listed, and at least one), and a unit test compares it with the manifest.
 */
export function entryParams(
  entries: readonly DsEntry[] = manifest,
): { locale: Locale; entry: string[] }[] {
  return LOCALES.flatMap((locale) =>
    entries.map((entry) => ({ locale, entry: entrySegments(entry) })),
  );
}

/** The params of the root layout, the overview page and the shell: the four locales. */
export function localeParams(): { locale: Locale }[] {
  return LOCALES.map((locale) => ({ locale }));
}

/** The path of an entry's page in `locale`. */
export function entryPath(locale: Locale, entry: DsEntry): string {
  return `/design-system/${locale}/${entry.id}`;
}

/** The path of an entry's frame in `locale`: the render with no chrome that the iframes load. */
export function framePath(locale: Locale, entry: DsEntry): string {
  return `/design-system/${locale}/frame/${entry.id}`;
}

/** The overview page's path. */
export function overviewPath(locale: Locale): string {
  return `/design-system/${locale}`;
}
