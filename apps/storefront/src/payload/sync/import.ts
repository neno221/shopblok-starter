import type { Payload, TypedUser } from "payload";
import { syncedFromGlobal, type SyncedMarkets } from "../../lib/markets/synced";

/**
 * Bootstrap's first sync, the Payload half (D75, `pnpm bootstrap` step 10): the documents the
 * backend's `export-for-payload.ts` wrote, upserted by `medusaId` through the Local API as the
 * `medusa-sync` integration (`overrideAccess: false`, so the same field access applies as to the
 * backend's REST writes), then the references, then the soft deletes, then `markets.synced`. A
 * document that already matches Medusa is not written, so a second bootstrap changes nothing.
 */

export const SYNC_COLLECTIONS = ["products", "categories", "collections"] as const;
type SyncCollection = (typeof SYNC_COLLECTIONS)[number];

export type SyncDocument = {
  fields: { medusaId: string } & Record<string, unknown>;
  references: Record<string, string | null>;
};

/** What `export-for-payload.ts` writes. */
export type SyncExport = {
  documents: Record<SyncCollection, SyncDocument[]>;
  markets: SyncedMarkets;
};

export type ImportCounts = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  markets: "updated" | "unchanged";
};

type Stored = Record<string, unknown> & { id: number | string; medusaId: string };

/** No revalidation per write: nothing has cached these yet, and a script has no Next cache. */
const CONTEXT = { disableRevalidate: true };

const idOf = (value: unknown): number | string | null =>
  typeof value === "number" || typeof value === "string"
    ? value
    : value !== null && typeof value === "object" && "id" in value
      ? ((value as { id: number | string }).id ?? null)
      : null;

const sameValue = (field: string, stored: unknown, wanted: unknown): boolean => {
  if (field === "medusaUpdatedAt") {
    return (
      typeof stored === "string" &&
      typeof wanted === "string" &&
      Date.parse(stored) === Date.parse(wanted)
    );
  }
  return (stored ?? null) === (wanted ?? null);
};

export async function importFromMedusa(
  payload: Payload,
  user: TypedUser,
  exported: SyncExport,
): Promise<ImportCounts> {
  const counts: ImportCounts = {
    created: 0,
    updated: 0,
    deleted: 0,
    unchanged: 0,
    markets: "unchanged",
  };
  const access = { user, overrideAccess: false, context: CONTEXT, depth: 0 } as const;
  const syncedAt = new Date().toISOString();

  for (const collection of SYNC_COLLECTIONS) {
    const { docs } = await payload.find({ collection, pagination: false, ...access });
    const stored = new Map(
      (docs as unknown as Stored[]).map((document) => [document.medusaId, document]),
    );
    const documents = exported.documents[collection] ?? [];

    // The documents themselves (a category's parent waits for the second pass).
    const written = new Set<string>();
    for (const document of documents) {
      const current = stored.get(document.fields.medusaId);
      const changed =
        current === undefined ||
        Object.entries(document.fields).some(
          ([field, value]) => !sameValue(field, current[field], value),
        );
      if (current === undefined) {
        const created = await payload.create({
          collection,
          data: { ...document.fields, syncedAt } as never,
          ...access,
        });
        stored.set(document.fields.medusaId, created as unknown as Stored);
        counts.created++;
        written.add(document.fields.medusaId);
      } else if (changed) {
        await payload.update({
          collection,
          id: current.id,
          data: { ...document.fields, syncedAt } as never,
          ...access,
        });
        counts.updated++;
        written.add(document.fields.medusaId);
      } else {
        counts.unchanged++;
      }
    }

    // The references, as Payload ids, now that every document exists.
    for (const document of documents) {
      const references = Object.entries(document.references);
      if (references.length === 0) continue;
      const current = stored.get(document.fields.medusaId);
      if (current === undefined) continue;
      const data: Record<string, number | string | null> = {};
      for (const [field, medusaId] of references) {
        const target = medusaId === null ? null : (stored.get(medusaId)?.id ?? null);
        if (idOf(current[field]) !== target) data[field] = target;
      }
      if (Object.keys(data).length === 0) continue;
      await payload.update({ collection, id: current.id, data: data as never, ...access });
      // A document written only for its reference counts as updated, not unchanged.
      if (!written.has(document.fields.medusaId)) {
        counts.unchanged--;
        counts.updated++;
        written.add(document.fields.medusaId);
      }
    }

    // What Medusa no longer has: marked, never removed.
    const inMedusa = new Set(documents.map((document) => document.fields.medusaId));
    for (const [medusaId, current] of stored) {
      if (inMedusa.has(medusaId) || current.deletedInMedusa === true) continue;
      await payload.update({
        collection,
        id: current.id,
        data: { deletedInMedusa: true, syncedAt } as never,
        ...access,
      });
      counts.deleted++;
    }
  }

  const markets = await payload.findGlobal({ slug: "markets", ...access });
  const stored = syncedFromGlobal((markets as { synced?: never }).synced);
  if (JSON.stringify(stored) !== JSON.stringify(exported.markets)) {
    await payload.updateGlobal({
      slug: "markets",
      data: { synced: { ...exported.markets, syncedAt } } as never,
      ...access,
    });
    counts.markets = "updated";
  }
  return counts;
}
