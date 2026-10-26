/**
 * T43 (D63): the product index is ADR 0002's A′ on `search-postgres`, and this is the S2
 * prototype's acceptance suite (commit `ca361b2`) ported to it. One `search_text` holds every
 * store locale's texts, the facets are ids, the `translation.*` events re-index, and a middleware
 * on `POST /store/search` gives the index the request's locale, checked against the store's.
 * The test names follow the ADR's table (T1, T2, T4, T6, T9, T10); T3 (isolation) is
 * informational for A′, which holds every language in one field by design. SETUP.md, "Search on
 * Postgres (T43)", lists a mutation that fails each test.
 *
 * Run (the compose stack up, from the repo root; `apps/backend/.env.test` points the runner at
 * its Postgres and keeps the dev stack's Redis out):
 *
 *   pnpm --filter @shopblok/backend test:integration:http search-locale.spec
 */
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { deleteTranslationsWorkflow } from "@medusajs/medusa/core-flows";

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

type Hit = { id: string; document: Record<string, unknown> };
type Facet = { values: { value: string; count: number }[] };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T43: search on Postgres, one multilingual index (A′)", () => {
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

      /** The ids of a `q` search's hits. A status other than 200 fails at once, with the body. */
      const hitIds = async (q: string, locale?: string, extra: object = {}) => {
        const response = await search({ entity: "product", filters: q ? { q } : {}, ...extra }, locale);

        if (response.status !== 200) {
          throw new Error(`q=${q} locale=${locale}: HTTP ${response.status} ${JSON.stringify(response.data)}`);
        }

        return (response.data.results[0].hits as Hit[]).map((hit) => hit.id);
      };

      const facets = async (field: string) => {
        const response = await search({
          entity: "product",
          search_options: { facets: [{ field, type: "value" }] },
        });

        expect(response.status).toBe(200);

        return (response.data.results[0].facets?.[field] as Facet | undefined)?.values ?? [];
      };

      /** Rebuilds the index from the database and waits until its version is live. */
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

      describe("T1: a seed writes every store locale into search_text", () => {
        it("each locale finds the shirt by its own words, and not the sweater", async () => {
          await reindex();

          for (const [locale, q] of [
            ["el-GR", "πουκάμισο"],
            ["de-DE", "Leinenhemd"],
            ["fr-FR", "chemise"],
            ["en-US", "shirt"],
          ] as const) {
            const ids = await hitIds(q, locale);

            expect({ locale, q, hit: ids.includes(linenId), sweater: ids.includes(sweaterId) }).toEqual({
              locale,
              q,
              hit: true,
              sweater: false,
            });
          }
        });

        it("translated category names are searchable (the graph selects categories.id)", async () => {
          await reindex();

          for (const q of ["Πουκάμισα", "Hemden", "Strickwaren"]) {
            expect({ q, ids: (await hitIds(q)).sort() }).toEqual({
              q,
              ids: [q === "Strickwaren" ? sweaterId : linenId],
            });
          }
        });

        it("search_text is never returned on a hit; the default language's title is", async () => {
          const response = await search({ entity: "product", filters: { q: "πουκάμισο" } }, "el-GR");
          const hit = (response.data.results[0].hits as Hit[]).find((h) => h.id === linenId)!;

          expect(hit.document).not.toHaveProperty("search_text");
          expect(hit.document).toMatchObject({
            title: "Linen shirt",
            category: ["Shirts"],
            category_ids: [shirtsId],
            collection_ids: [collectionId],
          });
        });
      });

      describe("T2: accents, tonos and capitals are ignored", () => {
        it("finds the Greek and French words without their accents and in capitals", async () => {
          for (const q of ["πουκαμισο", "ΠΟΥΚΑΜΙΣΟ", "legere", "LÉGÈRE"]) {
            expect({ q, hit: (await hitIds(q)).includes(linenId) }).toEqual({ q, hit: true });
          }
        });
      });

      describe("T3 (informational for A′): another language's word also hits", () => {
        it("Leinenhemd with el-GR finds the shirt, by design", async () => {
          expect(await hitIds("Leinenhemd", "el-GR")).toContain(linenId);
        });
      });

      describe("T4: translation events re-index without a restart, over the in-memory bus", () => {
        it("translation.updated on a product's title", async () => {
          const word = "Καλοκαιρινό";

          expect(await hitIds(word)).toEqual([]);
          await changeTranslation(getContainer(), linenId, "el-GR", { title: `${word} λινό πουκάμισο` });

          const { elapsedMs } = await until(async () => (await hitIds(word)).includes(linenId), {
            what: "the updated Greek title to be found",
          });

          console.log(`T4 translation.updated (product): ${elapsedMs} ms`);
        });

        it("translation.updated on a category's name reaches the products in it", async () => {
          const word = "Γιορτινά";

          await changeTranslation(getContainer(), shirtsId, "el-GR", { name: `${word} πουκάμισα` });
          await until(async () => (await hitIds(word)).includes(linenId), {
            what: "the updated Greek category name to be found",
          });
        });

        it("translation.created on a tag reaches the products that carry it", async () => {
          // A tag added to a product is a product.updated; its translation is the event under test.
          const container = getContainer();
          const products = container.resolve(Modules.PRODUCT);
          const [tag] = await products.createProductTags([{ value: "summer" }]);

          await products.updateProducts(linenId, { tag_ids: [tag!.id] });
          await container.resolve(Modules.SEARCH).ingest({ name: "product.updated", data: [{ id: linenId }] });
          expect(await hitIds("Sommer")).toEqual([]);

          await translate(container, "product_tag", tag!.id, { "de-DE": { value: "Sommer" } });
          await until(async () => (await hitIds("Sommer")).includes(linenId), {
            what: "the new German tag to be found",
          });
        });

        it("translation.deleted removes a locale's text", async () => {
          const container = getContainer();
          const query = container.resolve(ContainerRegistrationKeys.QUERY);

          expect(await hitIds("Leinenhemd")).toContain(linenId);

          const { data } = await query.graph({
            entity: "translations",
            fields: ["id"],
            filters: { reference_id: linenId, locale_code: "de-DE" },
          });

          expect(data).toHaveLength(1);
          await deleteTranslationsWorkflow(container).run({ input: { ids: data.map((t) => t.id) } });
          await until(async () => !(await hitIds("Leinenhemd")).includes(linenId), {
            what: "the deleted German title to stop hitting",
          });
        });
      });

      describe("T6: hits come back translated, with prices, from one /store/products call", () => {
        it("labels the hits in the visitor's locale", async () => {
          for (const [locale, q, title] of [
            ["el-GR", "πουκάμισο", "Λινό πουκάμισο"],
            ["de-DE", "Leinenhemd", "Leinenhemd"],
            ["fr-FR", "chemise", "Chemise en lin"],
          ] as const) {
            const ids = await hitIds(q, locale);

            // An empty `id[]` would list every product, so the hit itself is checked first.
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

      describe("Facets are ids, with counts, labelled by the storefront", () => {
        it("category_ids, collection_ids and option_value_ids", async () => {
          const categories = await facets("category_ids");

          expect(categories.map((v) => [v.value, v.count]).sort()).toEqual(
            [
              [shirtsId, 1],
              [knitwearId, 1],
            ].sort(),
          );
          expect(await facets("collection_ids")).toEqual([{ value: collectionId, count: 2 }]);

          // Each product has its own Size option, so four values, one product each.
          const values = await facets("option_value_ids");

          expect(values).toHaveLength(4);
          expect(values.every((v) => v.value.startsWith("optval_") && v.count === 1)).toBe(true);

          // The storefront labels the category ids in the visitor's locale (ADR 0002, T5).
          const response = await api.get(
            `/store/product-categories?${categories.map((v) => `id[]=${v.value}`).join("&")}&fields=id,name`,
            { headers: { ...headers, "x-medusa-locale": "el-GR" } },
          );

          expect((response.data.product_categories as { name: string }[]).map((c) => c.name).sort()).toEqual(
            ["Πλεκτά", "Πουκάμισα"].sort(),
          );
        });

        it("a facet id narrows the hits", async () => {
          expect(await hitIds("", undefined, { filters: { category_ids: [knitwearId] } })).toEqual([sweaterId]);
        });
      });

      describe("T9 and T7: a language added in the store, no restart", () => {
        it("pt-BR and mn-MN are found by their own words once translated", async () => {
          const container = getContainer();

          await addStoreLocales(container, Object.keys(MORE_LOCALES));
          await translate(container, "product", linenId, MORE_LOCALES);

          for (const q of ["Camisa", "linho", "Маалинган", "цамц", "МААЛИНГАН"]) {
            await until(async () => (await hitIds(q)).includes(linenId), {
              what: `"${q}" to find the shirt`,
            });
          }
        });
      });

      describe("T10: the request's locale reaches the search through the middleware", () => {
        it("a request with only x-medusa-locale finds the shirt in that language", async () => {
          for (const [locale, q] of [
            ["el-GR", "πουκάμισο"],
            ["de-DE", "Leinenhemd"],
            ["fr-FR", "chemise"],
          ] as const) {
            expect(await hitIds(q, locale)).toContain(linenId);
          }
        });

        it("drops a caller's search_options.locales, which search-postgres would refuse", async () => {
          const response = await search(
            { entity: "product", filters: { q: "shirt" }, search_options: { locales: ["de-DE"] } },
            "el-GR",
          );

          expect(response.status).toBe(200);
          expect((response.data.results[0].hits as Hit[]).map((h) => h.id)).toContain(linenId);
        });

        describe("for a provider that takes query-time locales (M6's Meilisearch)", () => {
          // What the route hands `query.search`, with the product index reported as served by a
          // provider other than search-postgres. The answer is faked: Postgres would refuse it.
          const sent = async (locale: string | undefined, searchOptions?: object) => {
            const container = getContainer();
            const searchModule = container.resolve(Modules.SEARCH);
            const query = container.resolve(ContainerRegistrationKeys.QUERY);
            const getIndex = searchModule.getIndex.bind(searchModule);
            const indexSpy = jest
              .spyOn(searchModule, "getIndex")
              .mockImplementation((name) => ({ ...getIndex(name), provider: "meilisearch" }));
            const searchSpy = jest
              .spyOn(query, "search")
              .mockResolvedValue([{ search_result: { hits: [] } }] as never);

            try {
              const response = await search(
                { entity: "product", filters: { q: "x" }, ...(searchOptions ? { search_options: searchOptions } : {}) },
                locale,
              );

              expect(response.status).toBe(200);
              expect(searchSpy).toHaveBeenCalledTimes(1);

              return (searchSpy.mock.calls[0]![0] as unknown as { search_options?: { locales?: string[] } }[])[0]!
                .search_options?.locales;
            } finally {
              indexSpy.mockRestore();
              searchSpy.mockRestore();
            }
          };

          it("sends the request's locale when the store supports it", async () => {
            expect(await sent("el-GR")).toEqual(["el-GR"]);
          });

          it("falls back to the default locale for one it does not, or none", async () => {
            expect(await sent("zz-ZZ")).toEqual(["en-US"]);
            expect(await sent("it-IT")).toEqual(["en-US"]);
            expect(await sent(undefined)).toEqual(["en-US"]);
          });

          it("overwrites the caller's locales", async () => {
            expect(await sent("de-DE", { locales: ["fr-FR", "zz-ZZ"] })).toEqual(["de-DE"]);
          });
        });
      });
    });
  },
});
