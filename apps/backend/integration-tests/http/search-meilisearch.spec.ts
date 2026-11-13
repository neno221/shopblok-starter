/**
 * T94 (D126): the product index on Meilisearch, one index per locale (ADR 0002's B), and ADR
 * 0002's acceptance suite ported to it from the S2 prototype (commit `ca361b2`), with the cases
 * its "Consequences" add for M6. The test names follow the ADR's table: T1, T2, T3 (required on
 * B: language isolation is what an index per locale is for), T4, T5, T6, T7, T9 and T10; then the
 * new locale searched before any write (decision 1's fallback), the stale copy, several locales in
 * one query, highlights, range facets and `MEILISEARCH_INDEX_PREFIX`. SETUP.md, "Meilisearch
 * (T94)", lists a mutation that fails each. `search-locale.spec.ts` keeps M3's suite on
 * `search-postgres`.
 *
 * Run (the compose stack up, Meilisearch included, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http search-meilisearch.spec
 *
 * The runner's database is new each run, Meilisearch is not: every index of this run carries its
 * own prefix and is deleted at the end.
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { deleteTranslationsWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows";

import {
  addStoreLocales,
  changeTranslation,
  createCategory,
  createCollection,
  createProduct,
  KNITWEAR_CATEGORY,
  LINEN_SHIRT,
  MORE_LOCALES,
  type Seeded,
  seedStore,
  SHIRTS_CATEGORY,
  translate,
  until,
  WOOL_SWEATER,
} from "./search-locale.fixtures";

jest.setTimeout(180_000);

// The compose stack's Meilisearch and its fixed development key (infra/docker-compose.yml; not a
// secret). `.env.test` blanks both for every other suite, which stays on Postgres; the module
// config reads these when the app loads, before any test.
const MEILISEARCH_HOST =
  process.env.MEILISEARCH_TEST_HOST?.trim() || `http://localhost:${process.env.MEILI_PORT || 7701}`;
const MEILISEARCH_API_KEY = "shopblok-local-dev-master-key";
const PREFIX = `t94_${Date.now().toString(36)}_${process.pid}`;

process.env.MEILISEARCH_HOST = MEILISEARCH_HOST;
process.env.MEILISEARCH_API_KEY = MEILISEARCH_API_KEY;
process.env.MEILISEARCH_INDEX_PREFIX = PREFIX;

type Hit = { id: string; document: Record<string, unknown>; highlights?: Record<string, string[]> };
type Facet = { values: { value: string; count: number }[] };

/** Meilisearch's REST API, for what the test checks behind the provider's back. */
async function meilisearch<T>(method: string, path: string): Promise<T> {
  const response = await fetch(`${MEILISEARCH_HOST}${path}`, {
    method,
    headers: { authorization: `Bearer ${MEILISEARCH_API_KEY}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Meilisearch ${method} ${path}: HTTP ${response.status}`);
  }

  return (response.status === 404 ? undefined : await response.json()) as T;
}

const indexUids = async () =>
  (await meilisearch<{ results: { uid: string }[] }>("GET", "/indexes?limit=1000")).results
    .map(({ uid }) => uid)
    .filter((uid) => uid.startsWith(`${PREFIX}_`));

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T94: search on Meilisearch, one index per locale (B)", () => {
      let seeded: Seeded;
      let headers: Record<string, string>;
      let linenId: string;
      let sweaterId: string;
      let shirtsId: string;
      let knitwearId: string;
      let collectionId: string;

      const search = (body: object, locale?: string) =>
        api.post("/store/search", body, {
          headers: { ...headers, ...(locale ? { "x-medusa-locale": locale } : {}) },
          validateStatus: () => true,
        });

      /** A `q` search's first result. A status other than 200 fails at once, with the body. */
      const result = async (q: string, locale?: string, extra: object = {}) => {
        const response = await search(
          { entity: "product", filters: q ? { q } : {}, ...extra },
          locale,
        );

        if (response.status !== 200) {
          throw new Error(
            `q=${q} locale=${locale}: HTTP ${response.status} ${JSON.stringify(response.data)}`,
          );
        }

        return response.data.results[0] as {
          hits: Hit[];
          facets?: Record<string, unknown>;
          metadata: { count: number | null };
        };
      };

      const hitIds = async (q: string, locale?: string, extra: object = {}) =>
        (await result(q, locale, extra)).hits.map((hit) => hit.id);

      /**
       * The physical index the product definition reads now (its live version), from the database:
       * the runner restores the database before each test, so a later test's version can be gone
       * there while its Meilisearch indexes are not.
       */
      const liveVersion = async () => {
        const { rows } = await getContainer()
          .resolve(ContainerRegistrationKeys.PG_CONNECTION)
          .raw(
            `select v.physical_name from search_index i
               join search_index_version v on v.search_index_id = i.id and v.version = i.active_version
              where i.name = 'product'`,
          );

        return (rows as { physical_name: string }[])[0]!.physical_name;
      };

      /** Rebuilds the index from the database and waits until its new version is live. */
      const reindex = async () => {
        const searchModule = getContainer().resolve(Modules.SEARCH);

        await searchModule.reindex({ index: "product" });
        await until(
          async () => (await searchModule.listIndexes()).every((index) => index.status === "ready"),
          { timeoutMs: 60_000, what: "the product index to be ready" },
        );
      };

      beforeAll(async () => {
        const container = getContainer();

        seeded = await seedStore(container);
        headers = { "x-publishable-api-key": seeded.publishableKey };

        shirtsId = await createCategory(container, SHIRTS_CATEGORY, "shirts");
        knitwearId = await createCategory(container, KNITWEAR_CATEGORY, "knitwear");
        collectionId = await createCollection(container, "Essentials");
        linenId = await createProduct(container, seeded, {
          handle: "linen-shirt",
          text: LINEN_SHIRT,
          categoryId: shirtsId,
          collectionId,
        });
        sweaterId = await createProduct(container, seeded, {
          handle: "wool-sweater",
          text: WOOL_SWEATER,
          categoryId: knitwearId,
          collectionId,
        });

        // The runner boots the app twice and the first instance's startup seed can fail on a
        // closed connection; a reindex makes the starting point certain.
        await reindex();
      });

      afterAll(async () => {
        // Meilisearch is shared with the dev stack: leave nothing of this run behind.
        for (const uid of await indexUids()) {
          await meilisearch("DELETE", `/indexes/${uid}`);
        }
      });

      describe("the index", () => {
        it("is served by Meilisearch, with Postgres still registered beside it", async () => {
          const searchModule = getContainer().resolve(Modules.SEARCH);

          expect(
            (await searchModule.listIndexes()).map((index) => [index.name, index.provider]),
          ).toEqual([["product", "meilisearch"]]);
        });

        it("is one Meilisearch index per store locale, named with MEILISEARCH_INDEX_PREFIX", async () => {
          const live = await liveVersion();
          const uids = (await indexUids()).filter((uid) => uid.startsWith(`${live}__`));

          expect(uids.sort()).toEqual(
            ["de-DE", "el-GR", "en-US", "fr-FR"].map((locale) => `${live}__${locale}`).sort(),
          );

          const stats = await meilisearch<{ numberOfDocuments: number }>(
            "GET",
            `/indexes/${live}__el-GR/stats`,
          );

          expect(stats.numberOfDocuments).toBe(2);
        });
      });

      describe("T1: each locale finds the shirt by its own words", () => {
        it("in its own index, and not the sweater", async () => {
          for (const [locale, q] of [
            ["el-GR", "πουκάμισο"],
            ["de-DE", "Leinenhemd"],
            ["fr-FR", "chemise"],
            ["en-US", "shirt"],
          ] as const) {
            const ids = await hitIds(q, locale);

            expect({
              locale,
              q,
              hit: ids.includes(linenId),
              sweater: ids.includes(sweaterId),
            }).toEqual({
              locale,
              q,
              hit: true,
              sweater: false,
            });
          }
        });

        it("finds translated category names in their locale", async () => {
          expect(await hitIds("Πουκάμισα", "el-GR")).toEqual([linenId]);
          expect(await hitIds("Strickwaren", "de-DE")).toEqual([sweaterId]);
        });

        it("returns the locale's own title, and never search_text", async () => {
          const { hits } = await result("πουκάμισο", "el-GR");
          const hit = hits.find((h) => h.id === linenId)!;

          expect(hit.document).not.toHaveProperty("search_text");
          expect(hit.document).not.toHaveProperty("_locales");
          expect(hit.document).toMatchObject({
            title: "Λινό πουκάμισο",
            category: ["Πουκάμισα"],
            category_ids: [shirtsId],
            collection_ids: [collectionId],
          });
        });

        it("matches a prefix as the visitor types (the overlay, D126)", async () => {
          expect(await hitIds("Lein", "de-DE")).toEqual([linenId]);
          expect(await hitIds("πουκ", "el-GR")).toEqual([linenId]);
        });
      });

      describe("T2: accents, tonos and capitals are ignored", () => {
        it("finds the Greek and French words without their accents and in capitals", async () => {
          for (const [locale, q] of [
            ["el-GR", "πουκαμισο"],
            ["el-GR", "ΠΟΥΚΑΜΙΣΟ"],
            ["fr-FR", "legere"],
            ["fr-FR", "LÉGÈRE"],
          ] as const) {
            expect({ q, hit: (await hitIds(q, locale)).includes(linenId) }).toEqual({
              q,
              hit: true,
            });
          }
        });
      });

      describe("T3 (required on B): a language's words do not hit another language", () => {
        it("Leinenhemd with el-GR does not find the shirt; with de-DE it does", async () => {
          expect(await hitIds("Leinenhemd", "el-GR")).toEqual([]);
          expect(await hitIds("πουκάμισο", "de-DE")).toEqual([]);
          expect(await hitIds("Leinenhemd", "de-DE")).toEqual([linenId]);
        });
      });

      describe("T4: translation events re-index without a restart", () => {
        it("translation.updated on a product's title", async () => {
          const word = "Καλοκαιρινό";

          expect(await hitIds(word, "el-GR")).toEqual([]);
          await changeTranslation(getContainer(), linenId, "el-GR", {
            title: `${word} λινό πουκάμισο`,
          });

          const { elapsedMs } = await until(
            async () => (await hitIds(word, "el-GR")).includes(linenId),
            {
              what: "the updated Greek title to be found",
            },
          );

          console.log(`T4 translation.updated (product): ${elapsedMs} ms`);
          // Only in Greek.
          expect(await hitIds(word, "de-DE")).toEqual([]);
        });

        it("translation.updated on a category's name reaches the products in it", async () => {
          const word = "Γιορτινά";

          await changeTranslation(getContainer(), shirtsId, "el-GR", { name: `${word} πουκάμισα` });
          await until(async () => (await hitIds(word, "el-GR")).includes(linenId), {
            what: "the updated Greek category name to be found",
          });
        });

        it("translation.deleted puts the default text back in that locale", async () => {
          const container = getContainer();
          const query = container.resolve(ContainerRegistrationKeys.QUERY);

          expect(await hitIds("Leinenhemd", "de-DE")).toContain(linenId);

          const { data } = await query.graph({
            entity: "translations",
            fields: ["id"],
            filters: { reference_id: linenId, locale_code: "de-DE" },
          });

          expect(data).toHaveLength(1);
          await deleteTranslationsWorkflow(container).run({
            input: { ids: data.map((t) => t.id) },
          });
          await until(async () => !(await hitIds("Leinenhemd", "de-DE")).includes(linenId), {
            what: "the deleted German title to stop hitting",
          });
          // The German copy now holds the default (English) title, as the shop shows it.
          expect(await hitIds("Linen", "de-DE")).toContain(linenId);
        });
      });

      describe("T5: facets are ids, with counts, in the active locale's index", () => {
        it("category_ids and collection_ids", async () => {
          const { facets } = await result("", "el-GR", {
            search_options: {
              facets: [
                { field: "category_ids", type: "value" },
                { field: "collection_ids", type: "value" },
              ],
            },
          });
          const categories = (facets!.category_ids as Facet).values;

          expect(categories.map((v) => [v.value, v.count]).sort()).toEqual(
            [
              [shirtsId, 1],
              [knitwearId, 1],
            ].sort(),
          );
          expect((facets!.collection_ids as Facet).values).toEqual([
            { value: collectionId, count: 2 },
          ]);
        });

        it("a facet id narrows the hits", async () => {
          expect(await hitIds("", "fr-FR", { filters: { category_ids: [knitwearId] } })).toEqual([
            sweaterId,
          ]);
        });
      });

      describe("T6: hits come back translated, with prices, from one /store/products call", () => {
        it("labels the hits in the visitor's locale", async () => {
          for (const [locale, q, title] of [
            ["el-GR", "πουκάμισο", "Λινό πουκάμισο"],
            ["fr-FR", "chemise", "Chemise en lin"],
          ] as const) {
            const ids = await hitIds(q, locale);

            expect(ids).toContain(linenId);

            const response = await api.get(
              `/store/products?${ids.map((id) => `id[]=${id}`).join("&")}` +
                `&region_id=${seeded.regionId}&fields=id,title,*variants.calculated_price`,
              { headers: { ...headers, "x-medusa-locale": locale } },
            );
            const product = (response.data.products as any[]).find((p) => p.id === linenId);

            expect({ locale, title: product.title }).toEqual({ locale, title });
            expect(product.variants[0].calculated_price.calculated_amount).toBe(49);
          }
        });
      });

      describe("Range facets, stats and highlights", () => {
        it("counts each range of min_price_eur, `from` inclusive and `to` exclusive", async () => {
          const { facets } = await result("", "en-US", {
            search_options: {
              facets: [
                {
                  field: "min_price_eur",
                  type: "range",
                  ranges: [{ to: 49 }, { from: 49, to: 50, key: "49" }, { from: 50 }],
                },
              ],
            },
          });

          expect(facets!.min_price_eur).toEqual({
            type: "range",
            ranges: [
              { key: "*-49", to: 49, count: 0 },
              { key: "49", from: 49, to: 50, count: 2 },
              { key: "50-*", from: 50, count: 0 },
            ],
          });
        });

        it("gives the price range over the matches (the listing's slider)", async () => {
          const { facets } = await result("shirt", "en-US", {
            search_options: { facets: [{ field: "min_price_usd", type: "stats" }] },
          });

          expect(facets!.min_price_usd).toMatchObject({ type: "stats", min: 54, max: 54 });
        });

        it("highlights the matched words of a retrievable field, in the locale's text", async () => {
          const { hits } = await result("πουκάμισο", "el-GR", {
            fields: ["id"],
            search_options: {
              highlight: { fields: ["title"], pre_tag: "<mark>", post_tag: "</mark>" },
            },
          });
          const hit = hits.find((h) => h.id === linenId)!;

          expect(hit.highlights?.title?.[0]).toContain("<mark>πουκάμισο</mark>");
          // `fields: ["id"]` still holds: the highlighted field is not added to the document.
          expect(hit.document).toEqual({ id: linenId });
        });
      });

      describe("Several locales in one query (federated search)", () => {
        it("finds a product once, whichever of the locales matched", async () => {
          const searchModule = getContainer().resolve(Modules.SEARCH);
          const answer = await searchModule.search({
            entity: "product",
            filters: { q: "πουκάμισο shirt" },
            search_options: {
              locales: ["el-GR", "en-US"],
              match_strategy: "last",
              facets: [{ field: "category_ids", type: "value" }],
            },
          });

          expect(answer.hits.map((hit) => hit.id)).toEqual([linenId]);
          expect(answer.metadata.count).toBe(1);
          expect(answer.facets?.category_ids).toEqual({
            type: "value",
            values: [{ value: shirtsId, count: 1 }],
          });
        });
      });

      describe("T10: the request's locale reaches the search through the middleware", () => {
        it("overwrites a caller's search_options.locales with the request's", async () => {
          const response = await search(
            {
              entity: "product",
              filters: { q: "Leinenhemd" },
              search_options: { locales: ["de-DE"] },
            },
            "el-GR",
          );

          expect(response.status).toBe(200);
          // Greek, not the German the caller asked for.
          expect(response.data.results[0].hits).toEqual([]);
        });

        it("searches the default locale for a locale the store does not have", async () => {
          expect(await hitIds("shirt", "zz-ZZ")).toContain(linenId);
          expect(await hitIds("πουκάμισο", "zz-ZZ")).toEqual([]);
        });
      });

      describe("T7 and T9: a language added in the store, no restart", () => {
        it("a locale added after the last write answers from the default locale's index, with a warning", async () => {
          const container = getContainer();
          const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
          const warn = jest.spyOn(logger, "warn");

          await reindex();
          await addStoreLocales(container, ["nl-NL"]);

          try {
            // Nothing has been written since the locale was added: it has no index.
            expect((await indexUids()).filter((uid) => uid.endsWith("__nl-NL"))).toEqual([]);
            expect(await hitIds("shirt", "nl-NL")).toEqual([linenId]);
            expect(await hitIds("shirt", "nl-NL")).toEqual([linenId]);

            const warnings = warn.mock.calls
              .map(([message]) => String(message))
              .filter((m) => m.includes("nl-NL"));

            expect(warnings).toHaveLength(1);
            expect(warnings[0]).toMatch(/no index for nl-NL/);
          } finally {
            warn.mockRestore();
          }
        });

        it("it-IT is searchable once translated, with no restart (T7)", async () => {
          const container = getContainer();

          await addStoreLocales(container, ["it-IT"]);
          await translate(container, "product", linenId, {
            "it-IT": { title: "Camicia di lino", description: "Una camicia leggera di puro lino." },
          });

          await until(async () => (await hitIds("Camicia", "it-IT")).includes(linenId), {
            what: "the Italian title to be found",
          });
          expect(await hitIds("Camicia", "en-US")).toEqual([]);
        });

        it("pt-BR and mn-MN are found by their own words once translated (T9)", async () => {
          const container = getContainer();

          await addStoreLocales(container, Object.keys(MORE_LOCALES));
          await translate(container, "product", linenId, MORE_LOCALES);

          for (const [locale, q] of [
            ["pt-BR", "Camisa"],
            ["pt-BR", "linho"],
            ["mn-MN", "Маалинган"],
            ["mn-MN", "цамц"],
            ["mn-MN", "МААЛИНГАН"],
          ] as const) {
            await until(async () => (await hitIds(q, locale)).includes(linenId), {
              what: `"${q}" to find the shirt in ${locale}`,
            });
          }

          // Mongolian has no language in Meilisearch, and its index still isolates it.
          expect(await hitIds("Маалинган", "el-GR")).toEqual([]);
        });

        it("removes a document's copy from a locale the store dropped, on its next write", async () => {
          const container = getContainer();
          const query = container.resolve(ContainerRegistrationKeys.QUERY);

          // Each test starts from the database as beforeAll left it, so this one adds Italian itself.
          await addStoreLocales(container, ["it-IT"]);
          await translate(container, "product", linenId, {
            "it-IT": { title: "Camicia di lino", description: "Una camicia leggera di puro lino." },
          });

          const italian = `/indexes/${await liveVersion()}__it-IT/documents/${linenId}`;

          await until(async () => (await meilisearch("GET", italian)) !== undefined, {
            what: "the shirt's Italian copy",
          });

          const { data: stores } = await query.graph({
            entity: "store",
            fields: ["id", "supported_locales.locale_code"],
          });
          const store = stores[0]!;

          await updateStoresWorkflow(container).run({
            input: {
              selector: { id: store.id },
              update: {
                supported_locales: (store.supported_locales ?? []).flatMap((l) =>
                  l?.locale_code && l.locale_code !== "it-IT"
                    ? [{ locale_code: l.locale_code }]
                    : [],
                ),
              },
            },
          });
          await container
            .resolve(Modules.SEARCH)
            .ingest({ name: "product.updated", data: [{ id: linenId }] });

          expect(await meilisearch("GET", italian)).toBeUndefined();
        });
      });
    });
  },
});
