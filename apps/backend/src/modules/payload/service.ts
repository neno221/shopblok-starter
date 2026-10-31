import type { Logger } from "@medusajs/framework/types";

import { createPayloadClient, type PayloadClient, type PayloadDoc } from "./client";
import { SYNCED_FIELDS, type SyncCollection, type SyncDocument } from "./mapping";

export type PayloadModuleOptions = {
  serverUrl: string;
  apiKey: string;
  userCollection?: string;
  /** Tests hand in a fake. */
  fetch?: typeof fetch;
};

/** A document's synced fields as they were before a write: what a compensation puts back. */
export type Snapshot = Record<string, unknown>;

export type Written = {
  id: number | string;
  /** The synced fields before the write; null when the write created the document. */
  previous: Snapshot | null;
};

/** One collection's part of a run. */
export type RunCounts = {
  created: number;
  updated: number;
  deleted: number;
  unchanged: number;
  failed: number;
};

/** A reconcile or bulk run, for Settings → Payload. */
export type SyncRun = {
  kind: "reconcile" | "bulk";
  startedAt: string;
  finishedAt: string;
  collections: Record<SyncCollection, RunCounts>;
  errors: string[];
};

/** A synced document as the reconcile job compares it. */
export type Listed = {
  id: number | string;
  medusaId: string;
  medusaUpdatedAt: string | null;
  deletedInMedusa: boolean;
  /** A category's parent, as a Payload id. */
  parent: number | string | null;
};

const PAGE_SIZE = 500;

const idOf = (value: unknown): number | string | null =>
  typeof value === "number" || typeof value === "string"
    ? value
    : value !== null && typeof value === "object" && "id" in value
      ? ((value as { id: number | string }).id ?? null)
      : null;

/**
 * The Payload module (D75, SPEC §6.2): writes Medusa's catalog (products, categories and collections) into Payload over REST,
 * as the `medusa-sync` integration. Steps and jobs call it; it reads nothing from Medusa itself
 * (a module sees only its own container), so the reads are in `src/lib/payload-sync.ts`.
 */
export default class PayloadModuleService {
  protected readonly client: PayloadClient;
  protected readonly logger: Logger;
  protected lastRun_: SyncRun | null = null;

  constructor({ logger }: { logger: Logger }, options: PayloadModuleOptions) {
    this.logger = logger;
    this.client = createPayloadClient({
      serverUrl: options.serverUrl,
      apiKey: options.apiKey,
      userCollection: options.userCollection,
      fetch: options.fetch,
    });
  }

  async findByMedusaId(collection: SyncCollection, medusaId: string): Promise<PayloadDoc | null> {
    const { docs } = await this.client.find(collection, {
      where: { medusaId: { equals: medusaId } },
      limit: 1,
    });
    return docs[0] ?? null;
  }

  /**
   * An e-mail's template in one language (T70, D84), English where that language has no text;
   * `null` when Payload has none of the type. `timeoutMs` is the e-mail's own limit (2 s).
   */
  async findEmailTemplate(
    type: string,
    language: string,
    timeoutMs: number,
  ): Promise<PayloadDoc | null> {
    const { docs } = await this.client.find("email-templates", {
      where: { type: { equals: type } },
      limit: 1,
      locale: language,
      fallbackLocale: "en",
      timeoutMs,
    });
    return docs[0] ?? null;
  }

  /** The synced fields of a stored document, references as Payload ids. */
  snapshot(collection: SyncCollection, document: PayloadDoc): Snapshot {
    const snapshot: Snapshot = {};
    for (const name of [...SYNCED_FIELDS[collection], "syncedAt"]) {
      const value = document[name];
      snapshot[name] = name === "parent" ? idOf(value) : (value ?? null);
    }
    return snapshot;
  }

  /**
   * Upserts a document's fields by `medusaId` (the references are `linkReferences`'s). Returns the
   * synced fields it had, for the compensation.
   */
  async writeDocument(collection: SyncCollection, document: SyncDocument): Promise<Written> {
    const data = { ...document.fields, syncedAt: new Date().toISOString() };
    const existing = await this.findByMedusaId(collection, document.fields.medusaId);
    if (existing === null) {
      const created = await this.client.create(collection, data);
      return { id: created.id, previous: null };
    }
    const previous = this.snapshot(collection, existing);
    await this.client.update(collection, existing.id, data);
    return { id: existing.id, previous };
  }

  /** Puts a document's synced fields back as they were (a compensation). */
  async restoreDocument(collection: SyncCollection, id: number | string, previous: Snapshot) {
    await this.client.update(collection, id, previous);
  }

  /** Removes a document the failed run created (a compensation). */
  async removeDocument(collection: SyncCollection, id: number | string) {
    await this.client.delete(collection, id);
  }

  /**
   * Writes the references as Payload ids. A target that is not in Payload yet is written as
   * empty and named in `missing`; the reconcile job sees the difference and writes it later.
   */
  async linkReferences(
    collection: SyncCollection,
    id: number | string,
    references: SyncDocument["references"],
  ): Promise<{ missing: string[] }> {
    const entries = Object.entries(references);
    if (entries.length === 0) return { missing: [] };
    const data: Record<string, number | string | null> = {};
    const missing: string[] = [];
    for (const [name, medusaId] of entries) {
      if (medusaId === null) {
        data[name] = null;
        continue;
      }
      // Every reference so far is a category's parent.
      const target = await this.findByMedusaId("categories", medusaId);
      if (target === null) missing.push(medusaId);
      data[name] = target?.id ?? null;
    }
    await this.client.update(collection, id, data);
    return { missing };
  }

  /** Soft delete (D75): the document stays, marked, so the CMS content and references survive. */
  async markDeleted(collection: SyncCollection, medusaId: string): Promise<Written | null> {
    const existing = await this.findByMedusaId(collection, medusaId);
    if (existing === null) return null;
    const previous = this.snapshot(collection, existing);
    if (existing.deletedInMedusa !== true) {
      await this.client.update(collection, existing.id, {
        deletedInMedusa: true,
        syncedAt: new Date().toISOString(),
      });
    }
    return { id: existing.id, previous };
  }

  /** Every synced document of a collection, as the reconcile job compares them. */
  async listDocuments(collection: SyncCollection): Promise<Listed[]> {
    const listed: Listed[] = [];
    for (let page = 1; ; page++) {
      const result = await this.client.find(collection, {
        limit: PAGE_SIZE,
        page,
        sort: "id",
        select: {
          medusaId: true,
          medusaUpdatedAt: true,
          deletedInMedusa: true,
          ...(collection === "categories" ? { parent: true } : {}),
        },
      });
      for (const document of result.docs) {
        if (typeof document.medusaId !== "string") continue;
        listed.push({
          id: document.id,
          medusaId: document.medusaId,
          medusaUpdatedAt:
            typeof document.medusaUpdatedAt === "string" ? document.medusaUpdatedAt : null,
          deletedInMedusa: document.deletedInMedusa === true,
          parent: idOf(document.parent),
        });
      }
      if (!result.hasNextPage) return listed;
    }
  }

  /** The last reconcile or bulk run in this process (none after a restart). */
  lastRun(): SyncRun | null {
    return this.lastRun_;
  }

  recordRun(run: SyncRun) {
    this.lastRun_ = run;
    const total = Object.values(run.collections).reduce(
      (sum, counts) => ({
        written: sum.written + counts.created + counts.updated + counts.deleted,
        failed: sum.failed + counts.failed,
      }),
      { written: 0, failed: 0 },
    );
    const message = `payload-sync: ${run.kind} wrote ${total.written} documents (${total.failed} failed)`;
    if (total.failed > 0) this.logger.warn(message);
    else this.logger.info(message);
  }
}
