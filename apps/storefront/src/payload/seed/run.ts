import type { Payload } from "payload";
import { DEFAULT_LOCALE } from "../locales";
import type { SeedCounts, SeedDocument, SeedModule } from "./types";
import { seededUpdate } from "./values";

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
 * `pnpm bootstrap`. A system task: access control is off, and nothing is revalidated.
 */
export async function runSeeds(payload: Payload, modules: SeedModule[]): Promise<SeedCounts> {
  const counts: SeedCounts = { created: 0, updated: 0, unchanged: 0 };
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
      if (created) counts.created++;
      else if (updated) counts.updated++;
      else counts.unchanged++;
    }
  }
  return counts;
}
