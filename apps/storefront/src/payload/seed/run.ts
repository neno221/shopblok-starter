import type { CollectionSlug, GlobalSlug, Payload } from "payload";
import { hasDraftsEnabled } from "payload/shared";
import { DEFAULT_LOCALE, LANGUAGES } from "../locales";
import type { SeedCounts, SeedDocument, SeedGlobal, SeedModule } from "./types";
import { comparable, seededUpdate } from "./values";

/** Seeds write many documents: no revalidation per save (the running site has none to refresh). */
const CONTEXT = { disableRevalidate: true };

type Stored = Record<string, unknown> & { id: number | string };

/** The changes one language needs, by the seed's rule; empty when there are none. */
function changesFor(doc: SeedDocument, stored: Stored | undefined, locale: string) {
  const data: Record<string, unknown> = {};
  for (const [field, perLocale] of Object.entries(doc.localized)) {
    const seeded = perLocale[locale];
    if (seeded === undefined) continue;
    const current = (stored?.[field] as Record<string, unknown> | undefined)?.[locale];
    const next = seededUpdate(current, seeded);
    if (next !== null) data[field] = next;
  }
  if (locale === DEFAULT_LOCALE) {
    for (const [field, seeded] of Object.entries(doc.shared ?? {})) {
      const next = seededUpdate(stored?.[field], seeded);
      if (next !== null) data[field] = next;
    }
  }
  return data;
}

/** The changes `allLanguages`' fields need, on `comparable` values in every language. */
function allChangesFor(doc: SeedDocument, stored: Stored | undefined) {
  const data: Record<string, unknown> = {};
  for (const [field, seeded] of Object.entries(doc.allLanguages ?? {})) {
    const probe = { value: comparable(seeded.value), before: seeded.before?.map(comparable) };
    if (seededUpdate(comparable(stored?.[field]), probe) !== null) data[field] = seeded.value;
  }
  return data;
}

/**
 * Whether an editor has an unpublished draft newer than the document's row (the text visitors
 * read). A seed write is not a draft save: Payload writes the row and saves a new version from the
 * row and the seed's data, which then is the newest and what the admin opens, so the editor's
 * draft would drop back into the version history. Such a document is left as it is.
 */
async function hasPendingDraft(
  payload: Payload,
  collection: CollectionSlug,
  stored: Stored,
): Promise<boolean> {
  const config = payload.collections[collection]?.config;
  if (config === undefined || !hasDraftsEnabled(config)) return false;
  const { docs } = await payload.findVersions({
    collection,
    where: { parent: { equals: stored.id } },
    sort: "-updatedAt",
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const newest = docs[0];
  const status = (newest?.version as { _status?: string } | undefined)?._status;
  if (newest === undefined || status !== "draft") return false;
  return Date.parse(String(newest.updatedAt)) > Date.parse(String(stored["updatedAt"]));
}

const isLanguageMap = (value: object): value is Record<string, unknown> => {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => LANGUAGES.includes(key));
};

/** `value` with each `{ en: …, el: … }` inside it replaced by `language`'s (left out without one). */
export function inLanguage(value: unknown, language: string): unknown {
  if (Array.isArray(value)) return value.map((item) => inLanguage(item, language));
  if (value === null || typeof value !== "object") return value;
  if (isLanguageMap(value)) return value[language];
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, inLanguage(item, language)]),
  );
}

/** The languages `value`'s texts are in, the default first (it writes the blocks' structure). */
function languagesOf(value: unknown): string[] {
  const found = new Set<string>([DEFAULT_LOCALE]);
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk);
    else if (node !== null && typeof node === "object") {
      if (isLanguageMap(node)) for (const key of Object.keys(node)) found.add(key);
      else Object.values(node).forEach(walk);
    }
  };
  walk(value);
  return [...found];
}

function localesOf(doc: SeedDocument): string[] {
  const all = new Set([DEFAULT_LOCALE]);
  for (const perLocale of Object.values(doc.localized)) {
    for (const locale of Object.keys(perLocale)) all.add(locale);
  }
  return [...all];
}

/**
 * Runs the seed modules (T59 step 8): each document is found by its `seedKey`, created when it is
 * missing (English first, then each other language), and otherwise updated field by field under
 * `seededUpdate`'s rule, so a second run changes nothing and an editor's change survives
 * `pnpm bootstrap`. Its `allLanguages` fields (a page's `layout`, T65) follow, compared in every
 * language at once and written one language at a time. A document with an editor's unpublished draft newer than its published text
 * is not written at all (`hasPendingDraft`) and is named in `kept`, so the draft stays what the
 * editor is working on; the next run after a publish or a discard takes the seed's changes. A
 * system task: access control is off, and nothing is revalidated.
 */
export async function runSeeds(payload: Payload, modules: SeedModule[]): Promise<SeedCounts> {
  const counts: SeedCounts = { created: 0, updated: 0, unchanged: 0, kept: [] };
  for (const { collection, documents } of modules) {
    for (const doc of await documents(payload)) {
      const { docs } = await payload.find({
        collection,
        where: { seedKey: { equals: doc.key } },
        locale: "all",
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
      });
      let stored = docs[0] as Stored | undefined;
      let created = false;
      let updated = false;
      if (
        stored !== undefined &&
        (localesOf(doc).some((locale) => Object.keys(changesFor(doc, stored, locale)).length > 0) ||
          Object.keys(allChangesFor(doc, stored)).length > 0) &&
        (await hasPendingDraft(payload, collection, stored))
      ) {
        counts.kept.push(`${collection}:${doc.key}`);
        continue;
      }
      for (const locale of localesOf(doc)) {
        const data = changesFor(doc, stored, locale);
        if (stored === undefined) {
          stored = (await payload.create({
            collection,
            locale: locale as never,
            data: { ...data, seedKey: doc.key, ...(doc.publish ? { _status: "published" } : {}) },
            overrideAccess: true,
            context: CONTEXT,
          } as never)) as unknown as Stored;
          created = true;
          // Read back in every language, so the next ones compare against what is stored.
          stored = (await payload.findByID({
            collection,
            id: stored.id,
            locale: "all",
            depth: 0,
            overrideAccess: true,
          })) as unknown as Stored;
        } else if (Object.keys(data).length > 0) {
          await payload.update({
            collection,
            id: stored.id,
            locale: locale as never,
            data,
            overrideAccess: true,
            context: CONTEXT,
          } as never);
          if (!created) updated = true;
        }
      }
      if (doc.allLanguages !== undefined && stored !== undefined) {
        // Read back in every language, so the comparison sees what the writes above left.
        const current = (await payload.findByID({
          collection,
          id: stored.id,
          locale: "all",
          depth: 0,
          overrideAccess: true,
        })) as unknown as Stored;
        const data = allChangesFor(doc, current);
        if (Object.keys(data).length > 0) {
          for (const locale of languagesOf(data)) {
            await payload.update({
              collection,
              id: stored.id,
              locale: locale as never,
              data: inLanguage(data, locale) as Record<string, unknown>,
              overrideAccess: true,
              context: CONTEXT,
            } as never);
          }
          if (!created) updated = true;
        }
      }
      if (created) counts.created++;
      else if (updated) counts.updated++;
      else counts.unchanged++;
    }
  }
  return counts;
}

const valueAt = (doc: Record<string, unknown>, path: string): unknown =>
  path
    .split(".")
    .reduce<unknown>(
      (value, key) =>
        value !== null && typeof value === "object"
          ? (value as Record<string, unknown>)[key]
          : undefined,
      doc,
    );

function setAt(target: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop() as string;
  let node = target;
  for (const key of keys) node = (node[key] ??= {}) as Record<string, unknown>;
  node[last] = value;
}

function deleteAt(target: Record<string, unknown>, path: string): void {
  const keys = path.split(".");
  const last = keys.pop() as string;
  const parent = valueAt(target, keys.join(".")) as Record<string, unknown> | undefined;
  if (keys.length === 0) delete target[last];
  else if (parent !== undefined) delete parent[last];
}

/** Whether an editor has a draft of the global newer than its published text (`hasPendingDraft`). */
async function hasPendingGlobalDraft(
  payload: Payload,
  slug: GlobalSlug,
  stored: Record<string, unknown>,
): Promise<boolean> {
  const config = payload.globals.config.find((global) => global.slug === slug);
  if (config === undefined || !hasDraftsEnabled(config)) return false;
  const { docs } = await payload.findGlobalVersions({
    slug,
    sort: "-updatedAt",
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const newest = docs[0];
  const status = (newest?.version as { _status?: string } | undefined)?._status;
  if (newest === undefined || status !== "draft") return false;
  return Date.parse(String(newest.updatedAt)) > Date.parse(String(stored["updatedAt"]));
}

/**
 * Runs the globals' seeds (T61) by T59's rule: a field is written while it is empty or still holds
 * what an earlier seed wrote (`seededUpdate`, on `comparable` values), so a second run changes
 * nothing and an editor's change survives `pnpm bootstrap`. A global is read and written in every
 * language at once (`locale: "all"`), so a menu's structure and its labels in each language are one
 * value. One that was never saved is written whole and published; one with an editor's pending
 * draft is left as it is and named in `kept`. Access control is off, nothing is revalidated.
 */
export async function runGlobalSeeds(payload: Payload, globals: SeedGlobal[]): Promise<SeedCounts> {
  const counts: SeedCounts = { created: 0, updated: 0, unchanged: 0, kept: [] };
  for (const { global, fields, perLocale = [] } of globals) {
    const stored = (await payload.findGlobal({
      slug: global,
      locale: "all",
      depth: 0,
      overrideAccess: true,
    } as never)) as unknown as Record<string, unknown>;
    const saved = typeof stored["updatedAt"] === "string";
    const data: Record<string, unknown> = {};
    for (const [path, seeded] of Object.entries(await fields(payload))) {
      const current = saved ? comparable(valueAt(stored, path)) : undefined;
      // Compared as `comparable` on both sides; written as the seed has it.
      const probe = { value: comparable(seeded.value), before: seeded.before?.map(comparable) };
      if (seededUpdate(current, probe) !== null) setAt(data, path, seeded.value);
    }
    if (Object.keys(data).length === 0) {
      counts.unchanged++;
      continue;
    }
    if (saved && (await hasPendingGlobalDraft(payload, global, stored))) {
      counts.kept.push(global);
      continue;
    }
    const write = (locale: string, values: Record<string, unknown>) =>
      payload.updateGlobal({
        slug: global,
        locale,
        data: values,
        depth: 0,
        overrideAccess: true,
        context: CONTEXT,
      } as never);
    // Everything but the per-language arrays in one write (publishing a new global), then each of
    // those arrays one language at a time.
    const languages: [string, Record<string, unknown>][] = [];
    for (const path of perLocale) {
      const value = valueAt(data, path) as Record<string, unknown> | undefined;
      if (value === undefined) continue;
      deleteAt(data, path);
      for (const [locale, localeValue] of Object.entries(value)) {
        const values: Record<string, unknown> = {};
        setAt(values, path, localeValue);
        languages.push([locale, values]);
      }
    }
    // A saved global whose only changes are per-language arrays needs no "all" write (PR 94
    // review, item 6): it would add a version that changes nothing.
    if (!saved) await write("all", { ...data, _status: "published" });
    else if (Object.keys(data).length > 0) {
      // One language at a time, the default first, as `runSeeds` writes `allLanguages` (PR 98
      // review, item 4): Payload 3.92.1 refuses a `locale: "all"` write of a global that holds a
      // localized array (`site-settings.productNotes`), as it validates the array as one object.
      // Changes in no language of their own (T65's `homepage`) are the default language's write.
      for (const locale of languagesOf(data))
        await write(locale, inLanguage(data, locale) as Record<string, unknown>);
    }
    for (const [locale, values] of languages) await write(locale, values);
    if (saved) counts.updated++;
    else counts.created++;
  }
  return counts;
}
