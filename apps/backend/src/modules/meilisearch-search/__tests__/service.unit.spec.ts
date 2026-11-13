/**
 * The provider against an in-memory stand-in for the client: what it writes where, which index a
 * query goes to, and what it refuses. Meilisearch itself (settings, ranking, federation, highlights)
 * is checked by `integration-tests/http/search-meilisearch.spec.ts` on the real server.
 */
import type { SearchTypes } from "@medusajs/framework/types";

import { MeilisearchSearchService } from "../service";
import { indexSettings } from "../settings";

type Doc = Record<string, unknown> & { id: string };

class NotFound extends Error {
  name = "MeilisearchApiError";
  cause = { code: "index_not_found" };
}

/** Enough of the `meilisearch` client for the provider: indexes, documents, searches, tasks. */
class FakeClient {
  indexes = new Map<string, { settings: unknown; docs: Map<string, Doc> }>();
  searches: { uid: string; params: Record<string, unknown> }[] = [];
  multi: unknown[] = [];
  private task = 0;

  private enqueued() {
    const taskUid = ++this.task;
    const promise = Promise.resolve({ taskUid }) as Promise<{ taskUid: number }> & {
      waitTask: () => Promise<{ status: string; uid: number }>;
    };

    promise.waitTask = async () => ({ status: "succeeded", uid: taskUid });

    return promise;
  }

  private need(uid: string) {
    const entry = this.indexes.get(uid);

    if (!entry) {
      throw new NotFound(`Index \`${uid}\` not found.`);
    }

    return entry;
  }

  index(uid: string) {
    return {
      updateSettings: (settings: unknown) => {
        const entry = this.indexes.get(uid) ?? { settings, docs: new Map() };

        this.indexes.set(uid, { ...entry, settings });

        return this.enqueued();
      },
      addDocuments: (docs: Doc[]) => {
        const entry = this.indexes.get(uid) ?? { settings: undefined, docs: new Map() };

        docs.forEach((doc) => entry.docs.set(doc.id, doc));
        this.indexes.set(uid, entry);

        return this.enqueued();
      },
      deleteDocuments: (ids: string[] | { filter: string }) => {
        if (Array.isArray(ids)) {
          ids.forEach((id) => this.need(uid).docs.delete(id));
        }

        return this.enqueued();
      },
      deleteAllDocuments: () => {
        this.need(uid).docs.clear();

        return this.enqueued();
      },
      search: async (q: string, params: Record<string, unknown>) => {
        this.need(uid);
        this.searches.push({ uid, params: { q, ...params } });

        return { hits: [], totalHits: 0, processingTimeMs: 1 };
      },
    };
  }

  async getRawIndexes() {
    const results = [...this.indexes.keys()].map((uid) => ({ uid }));

    return { results, total: results.length };
  }

  async getRawIndex(uid: string) {
    this.need(uid);

    return { uid };
  }

  async getStats() {
    return {
      indexes: Object.fromEntries(
        [...this.indexes].map(([uid, entry]) => [uid, { numberOfDocuments: entry.docs.size }]),
      ),
    };
  }

  deleteIndex(uid: string) {
    this.indexes.delete(uid);

    return this.enqueued();
  }

  async multiSearch(request: unknown) {
    this.multi.push(request);

    return { hits: [], estimatedTotalHits: 0, processingTimeMs: 1 };
  }

  tasks = {
    waitForTasks: async (uids: number[]) => uids.map((uid) => ({ uid, status: "succeeded" })),
  };
}

const definition = (overrides: Partial<SearchTypes.ResolvedSearchIndexDefinition> = {}) =>
  ({
    name: "product",
    entity: "product",
    primary_key: "id",
    provider: "meilisearch",
    physical_name: "product_v2",
    definition_hash: "x",
    fields: {
      id: { type: "keyword", filterable: true, retrievable: true },
      status: { type: "keyword", filterable: true, retrievable: false },
      title: { type: "text", searchable: { weight: 3 }, sortable: true, retrievable: true },
      search_text: { type: "text", searchable: { weight: 2 }, retrievable: false },
      category_ids: { type: "keyword", array: true, filterable: true, facetable: true },
      min_price_eur: {
        type: "float",
        filterable: true,
        sortable: true,
        facetable: { types: ["stats", "range"] },
      },
    },
    settings: {
      typo_tolerance: { enabled: true },
      provider_options: { meilisearch: { localized_field: "_locales", default_locale: "en-US" } },
    },
    seed: async function* () {},
    ...overrides,
  }) as SearchTypes.ResolvedSearchIndexDefinition;

function setup() {
  const fake = new FakeClient();
  const warnings: string[] = [];
  const service = new MeilisearchSearchService(
    { logger: { warn: (message: string) => warnings.push(message), info: () => {} } as never },
    { host: "http://meilisearch.test", api_key: "test-key" },
  );

  (service as unknown as { client: () => Promise<FakeClient> }).client = async () => fake;

  return { fake, service, warnings };
}

const query = (overrides: Partial<SearchTypes.ProviderSearchQuery> = {}) =>
  ({
    index: definition(),
    q: "shirt",
    attributes_to_retrieve: ["id", "title"],
    pagination: { skip: 0, take: 20 },
    search_options: {},
    ...overrides,
  }) as SearchTypes.ProviderSearchQuery;

describe("MeilisearchSearchService", () => {
  it("needs a host and a key", () => {
    expect(
      () => new MeilisearchSearchService({ logger: console as never }, { host: "", api_key: "k" }),
    ).toThrow(/MEILISEARCH_HOST/);
  });

  describe("writes (ADR 0002, B)", () => {
    it("creates only the default locale's index for a new version, settings first", async () => {
      const { fake, service } = setup();

      await service.upsertIndex({ index: definition({ physical_name: "product_v3" }) });

      expect([...fake.indexes.keys()]).toEqual(["product_v3__en-US"]);
      expect(fake.indexes.get("product_v3__en-US")!.settings).toEqual(
        indexSettings(definition(), "en"),
      );
    });

    it("writes each locale's copy to its own index, named after `index`, not the definition", async () => {
      const { fake, service } = setup();

      await service.upsertDocuments({
        // A reindex writes to the version being filled, while the definition names the live one.
        index: "product_v3",
        definition: definition({ physical_name: "product_v2" }),
        documents: [
          {
            id: "prod_1",
            status: "published",
            title: "Linen shirt",
            _locales: {
              "en-US": { title: "Linen shirt", search_text: "Linen shirt" },
              "el-GR": { title: "Λινό πουκάμισο", search_text: "Λινό πουκάμισο" },
            },
          },
        ],
      });

      expect([...fake.indexes.keys()].sort()).toEqual(["product_v3__el-GR", "product_v3__en-US"]);
      expect(fake.indexes.get("product_v3__el-GR")!.docs.get("prod_1")).toEqual({
        id: "prod_1",
        status: "published",
        title: "Λινό πουκάμισο",
        search_text: "Λινό πουκάμισο",
      });
      // The per-locale texts never reach an index as a field.
      expect(fake.indexes.get("product_v3__en-US")!.docs.get("prod_1")).not.toHaveProperty(
        "_locales",
      );
    });

    it("removes the copy from a locale the document no longer has", async () => {
      const { fake, service } = setup();
      const write = (locales: string[]) =>
        service.upsertDocuments({
          index: "product_v2",
          definition: definition(),
          documents: [
            { id: "a", _locales: Object.fromEntries(locales.map((l) => [l, { title: l }])) },
            { id: "b", _locales: { "en-US": { title: "b" }, "de-DE": { title: "b" } } },
          ],
        });

      await write(["en-US", "de-DE"]);
      await write(["en-US"]);

      expect([...fake.indexes.get("product_v2__de-DE")!.docs.keys()]).toEqual(["b"]);
      expect([...fake.indexes.get("product_v2__en-US")!.docs.keys()].sort()).toEqual(["a", "b"]);
    });

    it("refuses a locale key that is not a locale code", async () => {
      const { service } = setup();

      await expect(
        service.upsertDocuments({
          index: "product_v2",
          definition: definition(),
          documents: [{ id: "a", _locales: { "../x": {} } }],
        }),
      ).rejects.toThrow(/not a locale code/);
    });

    it("warns once per process for a locale Meilisearch has no language for", async () => {
      const { service, warnings } = setup();
      const write = () =>
        service.upsertDocuments({
          index: "product_v2",
          definition: definition(),
          documents: [{ id: "a", _locales: { "mn-MN": { title: "Маалинган цамц" } } }],
        });

      await write();
      (service as unknown as { knownIndexes_: Set<string> }).knownIndexes_.clear();
      await write();

      expect(warnings.filter((w) => w.includes("mn-MN"))).toHaveLength(1);
    });

    it("deletes and clears in every locale's index of the version", async () => {
      const { fake, service } = setup();

      await service.upsertDocuments({
        index: "product_v2",
        definition: definition(),
        documents: [{ id: "a", _locales: { "en-US": {}, "fr-FR": {} } }],
      });
      await service.deleteDocuments({ index: "product_v2", filters: { id: ["a"] } });

      expect(fake.indexes.get("product_v2__en-US")!.docs.size).toBe(0);
      expect(fake.indexes.get("product_v2__fr-FR")!.docs.size).toBe(0);
    });

    it("lists one entry per version, counting its largest locale", async () => {
      const { service } = setup();

      await service.upsertDocuments({
        index: "product_v2",
        definition: definition(),
        documents: [
          { id: "a", _locales: { "en-US": {}, "de-DE": {} } },
          { id: "b", _locales: { "en-US": {} } },
        ],
      });

      expect(await service.listIndexes()).toEqual([
        { name: "product_v2", provider: "meilisearch", document_count: 2 },
      ]);
    });

    it("deletes a version with all its locales", async () => {
      const { fake, service } = setup();

      await service.upsertDocuments({
        index: "product_v1",
        definition: definition(),
        documents: [{ id: "a", _locales: { "en-US": {}, "de-DE": {} } }],
      });
      await service.upsertIndex({ index: definition({ physical_name: "product_v2" }) });
      await service.deleteIndex({ index: "product_v1" });

      expect([...fake.indexes.keys()]).toEqual(["product_v2__en-US"]);
    });
  });

  describe("queries", () => {
    const seeded = async () => {
      const context = setup();

      await context.service.upsertDocuments({
        index: "product_v2",
        definition: definition(),
        documents: [{ id: "a", _locales: { "en-US": {}, "el-GR": {} } }],
      });
      context.fake.searches.length = 0;

      return context;
    };

    it("searches the one locale it is given, with its language", async () => {
      const { fake, service } = await seeded();

      await service.search(query({ search_options: { locales: ["el-GR"] } }));

      expect(fake.searches).toHaveLength(1);
      expect(fake.searches[0]).toMatchObject({
        uid: "product_v2__el-GR",
        params: { q: "shirt", locales: ["el"], page: 1, hitsPerPage: 20 },
      });
    });

    it("searches the default locale's index without a locale", async () => {
      const { fake, service } = await seeded();

      await service.search(query());

      expect(fake.searches[0]!.uid).toBe("product_v2__en-US");
    });

    it("answers a locale with no index from the default locale's, warning once", async () => {
      const { fake, service, warnings } = await seeded();

      await service.search(query({ search_options: { locales: ["it-IT"] } }));
      await service.search(query({ search_options: { locales: ["it-IT"] } }));

      expect(fake.searches.map((s) => s.uid)).toEqual(["product_v2__en-US", "product_v2__en-US"]);
      expect(fake.searches[0]!.params.locales).toEqual(["en"]);
      expect(warnings.filter((w) => w.includes("it-IT"))).toHaveLength(1);

      // Once the locale has an index, it is searched there.
      await service.upsertDocuments({
        index: "product_v2",
        definition: definition(),
        documents: [{ id: "a", _locales: { "en-US": {}, "el-GR": {}, "it-IT": {} } }],
      });
      await service.search(query({ search_options: { locales: ["it-IT"] } }));

      expect(fake.searches.at(-1)!.uid).toBe("product_v2__it-IT");
    });

    it("says NOT_FOUND when the version itself is gone, so the module reads the live one again", async () => {
      const { service } = await seeded();

      await expect(
        service.search(query({ index: definition({ physical_name: "product_v1" }) })),
      ).rejects.toMatchObject({ type: "not_found" });
    });

    it("searches several locales as one federated search, distinct by id", async () => {
      const { fake, service } = await seeded();

      await service.search(
        query({
          search_options: { locales: ["el-GR", "en-US"], facets: [{ field: "category_ids" }] },
          pagination: { skip: 20, take: 10 },
        }),
      );

      expect(fake.searches).toHaveLength(0);
      expect(fake.multi[0]).toMatchObject({
        federation: {
          limit: 10,
          offset: 20,
          distinct: "id",
          facetsByIndex: {
            "product_v2__el-GR": ["category_ids"],
            "product_v2__en-US": ["category_ids"],
          },
          mergeFacets: {},
        },
        queries: [
          { indexUid: "product_v2__el-GR", q: "shirt", locales: ["el"] },
          { indexUid: "product_v2__en-US", q: "shirt", locales: ["en"] },
        ],
      });
    });

    it("counts each range of a range facet with its own query, `to` exclusive", async () => {
      const { fake, service } = await seeded();

      await service.search(
        query({
          filters: { status: "published" },
          search_options: {
            facets: [
              {
                field: "min_price_eur",
                type: "range",
                ranges: [{ to: 50 }, { from: 50, key: "high" }],
              },
            ],
          },
        }),
      );

      expect(fake.searches.map((s) => s.params.filter).sort()).toEqual(
        [
          'status = "published"',
          '(status = "published") AND (min_price_eur < 50)',
          '(status = "published") AND (min_price_eur >= 50)',
        ].sort(),
      );
    });

    it("refuses what it cannot answer exactly", async () => {
      const { service } = await seeded();

      await expect(
        service.search(query({ search_options: { match_strategy: "any" } })),
      ).rejects.toThrow(/any/);
      await expect(
        service.search(query({ search_options: { vector: { value: [1] } } })),
      ).rejects.toThrow(/vector/);
      await expect(service.search(query({ pagination: { take: 5, cursor: "x" } }))).rejects.toThrow(
        /cursor/,
      );
      await expect(
        service.search(query({ pagination: { take: 5, order: { _score: "DESC", title: "ASC" } } })),
      ).rejects.toThrow(/_score/);
      await expect(
        service.search(query({ search_options: { locales: ["zz_ZZ/../x"] } })),
      ).rejects.toThrow(/not a locale code/);
    });

    it("sorts by the order it is given, and asks for highlights of retrievable fields only", async () => {
      const { fake, service } = await seeded();

      await service.search(
        query({
          pagination: { skip: 0, take: 5, order: { min_price_eur: "ASC", _score: "DESC" } },
          search_options: {
            highlight: { fields: ["title", "search_text"], pre_tag: "<b>", post_tag: "</b>" },
          },
        }),
      );

      expect(fake.searches[0]!.params).toMatchObject({
        sort: ["min_price_eur:asc"],
        attributesToHighlight: ["title"],
        highlightPreTag: "<b>",
        highlightPostTag: "</b>",
      });
    });
  });
});
