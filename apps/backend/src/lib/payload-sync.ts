import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { PAYLOAD_MODULE } from "../modules/payload";
import {
  ENTITY,
  QUERY_FIELDS,
  REGION_FIELDS,
  STORE_FIELDS,
  SYNC_COLLECTIONS,
  documentOf,
  isoTime,
  marketsSynced,
  parentsFirst,
  sameMarkets,
  type MarketsSynced,
  type MedusaRegion,
  type MedusaStore,
  type SyncCollection,
  type SyncDocument,
} from "../modules/payload/mapping";
import type PayloadModuleService from "../modules/payload/service";
import type { Listed, RunCounts, SyncRun } from "../modules/payload/service";
import {
  markPayloadDeletedWorkflow,
  syncPayloadDocumentWorkflow,
  syncPayloadMarketsWorkflow,
} from "../workflows/sync-to-payload";

/**
 * The Medusa side of the Medusa → Payload sync (D75, D76): what to read from Medusa, and when to
 * write. The subscriber syncs what an event names; the reconcile job and the bulk route compare
 * everything (`reconcile`); `export-for-payload.ts` writes the same documents to a file for
 * bootstrap. The writes themselves are the workflows in `src/workflows/sync-to-payload.ts`.
 */

type Query = { graph: (input: Record<string, unknown>) => Promise<{ data: unknown[] }> };

const queryOf = (container: MedusaContainer): Query =>
  container.resolve(ContainerRegistrationKeys.QUERY) as unknown as Query;

const loggerOf = (container: MedusaContainer) =>
  container.resolve(ContainerRegistrationKeys.LOGGER);

let warnedOff = false;

/** The module, or undefined (once logged) when `PAYLOAD_SERVER_URL` or `PAYLOAD_API_KEY` is unset. */
export function payloadModule(container: MedusaContainer): PayloadModuleService | undefined {
  if (container.hasRegistration(PAYLOAD_MODULE)) {
    return container.resolve<PayloadModuleService>(PAYLOAD_MODULE);
  }
  if (!warnedOff) {
    warnedOff = true;
    loggerOf(container).info(
      "payload-sync: off (PAYLOAD_SERVER_URL or PAYLOAD_API_KEY is not set; `pnpm bootstrap` writes both).",
    );
  }
  return undefined;
}

/** Medusa's records of a collection as sync documents; with `ids`, those (deleted ones too). */
export async function readDocuments(
  query: Query,
  collection: SyncCollection,
  ids?: string[],
): Promise<SyncDocument[]> {
  const { data } = await query.graph({
    entity: ENTITY[collection],
    fields: QUERY_FIELDS[collection],
    ...(ids === undefined ? {} : { filters: { id: ids }, withDeleted: true }),
  });
  return data.map((record) => documentOf(collection, record));
}

/** The markets' synced part, from the regions and the store. */
export async function readMarkets(query: Query): Promise<MarketsSynced> {
  const [{ data: regions }, { data: stores }] = await Promise.all([
    query.graph({ entity: "region", fields: REGION_FIELDS }),
    query.graph({ entity: "store", fields: STORE_FIELDS }),
  ]);
  return marketsSynced(regions as MedusaRegion[], stores[0] as MedusaStore | undefined);
}

/** A workflow throws its step's error serialized, `{ message, name, stack }`, not an `Error`. */
export const message = (error: unknown): string =>
  error !== null && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);

/**
 * What an event names: each record is read again (an event carries ids only) and written; a
 * record Medusa no longer has at all is marked deleted. Never throws: a failure is logged, and the
 * reconcile job catches up.
 */
export async function syncRecords(
  container: MedusaContainer,
  collection: SyncCollection,
  ids: string[],
): Promise<void> {
  if (ids.length === 0 || payloadModule(container) === undefined) return;
  const logger = loggerOf(container);
  let documents: SyncDocument[];
  try {
    documents = parentsFirst(await readDocuments(queryOf(container), collection, ids));
  } catch (error) {
    logger.warn(`payload-sync: could not read ${collection} ${ids.join(", ")}: ${message(error)}`);
    return;
  }
  const found = new Set(documents.map((document) => document.fields.medusaId));
  for (const document of documents) {
    try {
      const { result } = await syncPayloadDocumentWorkflow(container).run({
        input: { collection, document },
      });
      if (result.missing.length > 0) {
        logger.info(
          `payload-sync: ${collection} ${document.fields.medusaId} refers to ${result.missing.join(", ")}, not in Payload yet; the reconcile job links it later.`,
        );
      }
    } catch (error) {
      logger.warn(
        `payload-sync: ${collection} ${document.fields.medusaId} not written: ${message(error)}`,
      );
    }
  }
  for (const medusaId of ids.filter((id) => !found.has(id))) {
    try {
      await markPayloadDeletedWorkflow(container).run({ input: { collection, medusaId } });
    } catch (error) {
      logger.warn(`payload-sync: ${collection} ${medusaId} not marked deleted: ${message(error)}`);
    }
  }
}

/** Writes `markets.synced` when it differs from Medusa (or always, with `force`). */
export async function syncMarkets(
  container: MedusaContainer,
  { force = false }: { force?: boolean } = {},
): Promise<"updated" | "unchanged"> {
  const payload = payloadModule(container);
  if (payload === undefined) return "unchanged";
  const synced = await readMarkets(queryOf(container));
  const stored = await payload.readMarkets();
  if (!force && stored !== null && sameMarkets(stored, synced)) return "unchanged";
  await syncPayloadMarketsWorkflow(container).run({ input: synced });
  return "updated";
}

const sameTime = (a: string | null, b: unknown): boolean =>
  a !== null && typeof b === "string" && new Date(a).getTime() === new Date(b).getTime();

/** Why a stored document needs a write, or null when it matches Medusa's record. */
export function needsWrite(
  document: SyncDocument,
  stored: Listed | undefined,
  medusaIdOfPayloadId: ReadonlyMap<string, string>,
): "create" | "update" | null {
  if (stored === undefined) return "create";
  if (stored.deletedInMedusa !== document.fields.deletedInMedusa) return "update";
  if (!sameTime(stored.medusaUpdatedAt, document.fields.medusaUpdatedAt)) return "update";
  if ("parent" in document.references) {
    const parent =
      stored.parent === null ? null : (medusaIdOfPayloadId.get(String(stored.parent)) ?? null);
    if (parent !== document.references.parent) return "update";
  }
  return null;
}

const emptyCounts = (): RunCounts => ({
  created: 0,
  updated: 0,
  deleted: 0,
  unchanged: 0,
  failed: 0,
});

/**
 * Compares every synced document both ways (D75): Medusa's records against Payload's documents by
 * id and `updated_at`, and Payload's documents against Medusa's ids, so a record changed or
 * deleted while Payload was down, or a change that emits no event, is caught. `force` (the bulk
 * route) writes every record. Never throws; the run's counts are kept for Settings → Payload.
 */
export async function reconcile(
  container: MedusaContainer,
  { kind, force = false }: { kind: SyncRun["kind"]; force?: boolean },
): Promise<SyncRun | undefined> {
  const payload = payloadModule(container);
  if (payload === undefined) return undefined;
  const query = queryOf(container);
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const collections = {} as Record<SyncCollection, RunCounts>;

  for (const collection of SYNC_COLLECTIONS) {
    const counts = emptyCounts();
    collections[collection] = counts;
    let documents: SyncDocument[];
    let stored: Listed[];
    try {
      [documents, stored] = await Promise.all([
        readDocuments(query, collection).then(parentsFirst),
        payload.listDocuments(collection),
      ]);
    } catch (error) {
      counts.failed++;
      errors.push(`${collection}: ${message(error)}`);
      continue;
    }
    const byMedusaId = new Map(stored.map((document) => [document.medusaId, document]));
    const medusaIdOfPayloadId = new Map(
      stored.map((document) => [String(document.id), document.medusaId]),
    );

    for (const document of documents) {
      const need = force
        ? byMedusaId.has(document.fields.medusaId)
          ? "update"
          : "create"
        : needsWrite(document, byMedusaId.get(document.fields.medusaId), medusaIdOfPayloadId);
      if (need === null) {
        counts.unchanged++;
        continue;
      }
      try {
        await syncPayloadDocumentWorkflow(container).run({ input: { collection, document } });
        counts[need === "create" ? "created" : "updated"]++;
      } catch (error) {
        counts.failed++;
        errors.push(`${collection} ${document.fields.medusaId}: ${message(error)}`);
      }
    }

    const inMedusa = new Set(documents.map((document) => document.fields.medusaId));
    for (const document of stored) {
      if (document.deletedInMedusa || inMedusa.has(document.medusaId)) continue;
      try {
        await markPayloadDeletedWorkflow(container).run({
          input: { collection, medusaId: document.medusaId },
        });
        counts.deleted++;
      } catch (error) {
        counts.failed++;
        errors.push(`${collection} ${document.medusaId}: ${message(error)}`);
      }
    }
  }

  let markets: SyncRun["markets"];
  try {
    markets = await syncMarkets(container, { force });
  } catch (error) {
    markets = "failed";
    errors.push(`markets: ${message(error)}`);
  }

  const run: SyncRun = {
    kind,
    startedAt,
    finishedAt: new Date().toISOString(),
    collections,
    markets,
    errors: errors.slice(0, 20),
  };
  payload.recordRun(run);
  return run;
}

/** Everything bootstrap's import needs, from Medusa alone (`export-for-payload.ts`). */
export type SyncExport = {
  exportedAt: string;
  documents: Record<SyncCollection, SyncDocument[]>;
  markets: MarketsSynced;
};

export async function exportAll(container: MedusaContainer): Promise<SyncExport> {
  const query = queryOf(container);
  const documents = {} as Record<SyncCollection, SyncDocument[]>;
  for (const collection of SYNC_COLLECTIONS) {
    const read = await readDocuments(query, collection);
    documents[collection] = collection === "categories" ? parentsFirst(read) : read;
  }
  return { exportedAt: isoTime(new Date()), documents, markets: await readMarkets(query) };
}
