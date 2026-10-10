/**
 * ADR 0002 (S2): the facts about Medusa 2.21.2's Search and Translation Modules that the
 * per-locale search design rests on, checked on the stock configuration: `search-postgres` and
 * the `product` index, no prototype code. Each test names the sentence of the ADR it guards. If
 * one fails after a Medusa upgrade, read ADR 0002 again before changing the test: the design may
 * be simpler (Medusa gained locale support) or broken (an event or an option changed).
 *
 * Run (the compose stack up, from the repo root; `apps/backend/.env.test` points the runner at its
 * Postgres and keeps the dev stack's Redis out):
 *
 *   pnpm --filter @shopblok/backend test:integration:http search-locale-assumptions
 *
 * CI does not run the backend's integration tests yet (T17 decides whether it should).
 */
import { medusaIntegrationTestRunner, TestEventUtils } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import {
  batchTranslationsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createShippingProfilesWorkflow,
  deleteTranslationsWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows";

import { SUPPORTED_LOCALES, TRANSLATED_LOCALES } from "../../src/config/markets";
import seedMarkets from "../../src/scripts/seed-markets";

jest.setTimeout(180_000);

// The seed sets the store's locales to exactly `SUPPORTED_LOCALES`, and the translation workflows
// accept only those, so the spec reads its locales from the starter's lists: editing the locale
// lists in `src/config/markets.ts` must not break it. `en-US`, the first, is the data's language.
const [DEFAULT_LOCALE] = SUPPORTED_LOCALES;
const [TRANSLATED_LOCALE] = TRANSLATED_LOCALES;

type SearchOptions = { headers?: Record<string, string>; path?: string };

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("ADR 0002: what the per-locale search design rests on", () => {
      let headers: Record<string, string>;
      let salesChannelId: string;
      let shippingProfileId: string;

      const search = async (body: object, { headers: extra = {}, path = "" }: SearchOptions = {}) =>
        api.post(`/store/search${path}`, body, {
          headers: { ...headers, ...extra },
          validateStatus: () => true,
        });

      // The hits of a `q` search. A status other than 200 (a wrong key, a missing index) fails at
      // once with the body, instead of reading as "no hits".
      const hits = async (q: string, options?: SearchOptions) => {
        const response = await search({ entity: "product", filters: { q } }, options);

        if (response.status !== 200) {
          throw new Error(
            `/store/search answered ${response.status}: ${JSON.stringify(response.data)}`,
          );
        }

        return response.data.results[0].hits as {
          document: { id: string; title: string };
        }[];
      };

      const titles = async (q: string, options?: SearchOptions) =>
        (await hits(q, options)).map((hit) => hit.document.title);

      // Returns once the index handlers of the new product are done: it is searchable, and no
      // handler outlives the test and writes into the next one's restored database. The handlers
      // are Medusa's `search-ingestion` subscriber on these two events; the bus itself reports
      // nothing, so the test-utils helper wraps the subscribers. It is set up before the workflow
      // runs, because the events fire inside it.
      const createProduct = async (handle: string, title: string, categoryIds: string[] = []) => {
        const bus = getContainer().resolve(Modules.EVENT_BUS);
        const indexed = Promise.all(
          ["product.created", "product-variant.created"].map((name) =>
            TestEventUtils.waitSubscribersExecution(name, bus),
          ),
        );
        const { result } = await createProductsWorkflow(getContainer()).run({
          input: {
            products: [
              {
                title,
                handle,
                status: ProductStatus.PUBLISHED,
                shipping_profile_id: shippingProfileId,
                category_ids: categoryIds,
                sales_channels: [{ id: salesChannelId }],
                options: [{ title: "Size", values: ["S"] }],
                variants: [
                  {
                    title: "S",
                    options: { Size: "S" },
                    manage_inventory: false,
                    prices: [{ amount: 49, currency_code: "eur" }],
                  },
                ],
              },
            ],
          },
        });

        await indexed;

        return result[0]!.id;
      };

      beforeAll(async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);

        // The default shipping profile comes from a migration script the runner does not run.
        await createShippingProfilesWorkflow(container).run({
          input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
        });
        await seedMarkets({ container, args: [] } as never);

        // The runner boots the app twice and the first instance's startup seed can fail on a
        // closed connection; an explicit reindex makes the product index certain to be active.
        await container.resolve(Modules.SEARCH).reindex({ index: "product" });

        const { data: stores } = await query.graph({
          entity: "store",
          fields: ["default_sales_channel_id"],
        });
        const { data: profiles } = await query.graph({
          entity: "shipping_profile",
          fields: ["id"],
          filters: { type: "default" },
        });
        const { data: keys } = await query.graph({
          entity: "api_key",
          fields: ["token"],
          filters: { type: "publishable" },
        });

        salesChannelId = stores[0]!.default_sales_channel_id!;
        shippingProfileId = profiles[0]!.id;
        headers = { "x-publishable-api-key": keys[0]!.token as string };
      });

      it("search-postgres rejects search_options.locales, so a storefront cannot pass the locale to it", async () => {
        const response = await search({
          entity: "product",
          filters: { q: "shirt" },
          search_options: { locales: [TRANSLATED_LOCALE] },
        });

        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(JSON.stringify(response.data)).toContain("does not support query-time locales");
      });

      it("/store/search ignores the request's locale, and the index holds the default language only", async () => {
        const container = getContainer();
        const id = await createProduct("linen-shirt", "Linen shirt");

        await batchTranslationsWorkflow(container).run({
          input: {
            create: [
              {
                reference: "product",
                reference_id: id,
                locale_code: TRANSLATED_LOCALE,
                translations: { title: "Translated" },
              },
            ],
            update: [],
            delete: [],
          },
        });

        // Index the product again with its translation present: the index still holds English only.
        await container.resolve(Modules.SEARCH).ingest({ name: "product.updated", data: [{ id }] });

        for (const locale of [TRANSLATED_LOCALE, DEFAULT_LOCALE]) {
          // Neither way of sending the locale changes what the index holds or returns. They are
          // separate requests: Medusa reads `?locale=` first, so with both only it would be tested.
          const requests = [
            { headers: { "x-medusa-locale": locale } },
            { path: `?locale=${locale}` },
          ];

          for (const options of requests) {
            expect(await titles("Translated", options)).toEqual([]);
            expect(await titles("Linen", options)).toEqual(["Linen shirt"]);
          }
        }
      });

      it("search-postgres folds Greek accents and capitals, and lowercases Cyrillic, with its default text-search configuration", async () => {
        await createProduct("greek-shirt", "Λινό πουκάμισο");
        await createProduct("mongolian-shirt", "Маалинган цамц");

        for (const q of ["πουκαμισο", "ΠΟΥΚΑΜΙΣΟ", "λινο"]) {
          expect(await titles(q)).toEqual(["Λινό πουκάμισο"]);
        }

        for (const q of ["Маалинган", "МААЛИНГАН"]) {
          expect(await titles(q)).toEqual(["Маалинган цамц"]);
        }
      });

      it("query.graph translates a nested object only when the object's id is selected", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: { product_categories: [{ name: "Shirts", handle: "shirts", is_active: true }] },
        });
        const categoryId = categories[0]!.id;
        const productId = await createProduct("categorised", "Categorised", [categoryId]);

        await batchTranslationsWorkflow(container).run({
          input: {
            create: [
              {
                reference: "product_category",
                reference_id: categoryId,
                locale_code: TRANSLATED_LOCALE,
                translations: { name: "Translated shirts" },
              },
            ],
            update: [],
            delete: [],
          },
        });

        const names = async (fields: string[]) => {
          const { data } = await query.graph(
            { entity: "product", fields, filters: { id: productId } },
            { locale: TRANSLATED_LOCALE },
          );

          return (data[0] as { categories: { name: string }[] }).categories.map((c) => c.name);
        };

        expect(await names(["id", "categories.name"])).toEqual(["Shirts"]);
        expect(await names(["id", "categories.id", "categories.name"])).toEqual([
          "Translated shirts",
        ]);
      });

      it("a translation event carries translation ids, which the translations entity maps back to the translated entity, also after a delete", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const bus = container.resolve(Modules.EVENT_BUS);
        const productId = await createProduct("event-source", "Event source");

        // Runs `action` and returns its result with the ids the `name` event carries. The wait is
        // set up first because the event fires inside the action. The helper resolves with one
        // entry per subscriber: with none (the stock configuration has none for `translation.*`)
        // the entry is the event body.
        const emits = async <T>(name: string, action: () => Promise<T>) => {
          const emitted = TestEventUtils.waitSubscribersExecution(name, bus);
          const result = await action();
          const [{ data }] = await emitted;

          return { result, ids: (Array.isArray(data) ? data : [data]).map((d) => d.id as string) };
        };

        // The index handler's step: the translations entity maps the event's ids to the entity.
        const expectMapped = async (ids: string[], translationId: string, withDeleted: boolean) => {
          expect(ids).toEqual([translationId]);

          const { data } = await query.graph({
            entity: "translations",
            fields: ["id", "reference", "reference_id", "locale_code"],
            filters: { id: ids },
            withDeleted,
          });

          expect(data).toEqual([
            {
              id: translationId,
              reference: "product",
              reference_id: productId,
              locale_code: TRANSLATED_LOCALE,
            },
          ]);
        };

        const { result: batch, ids: createdIds } = await emits("translation.created", () =>
          batchTranslationsWorkflow(container).run({
            input: {
              create: [
                {
                  reference: "product",
                  reference_id: productId,
                  locale_code: TRANSLATED_LOCALE,
                  translations: { title: "Translated" },
                },
              ],
              update: [],
              delete: [],
            },
          }),
        );

        expect(batch.result.created).toHaveLength(1);

        const translationId = batch.result.created[0]!.id;

        await expectMapped(createdIds, translationId, false);

        // The by-id form is what the admin and the batch workflow use. The `selector` form (the
        // second example in the workflow's own docs) throws in 2.21.2, so it emits nothing.
        const { ids: updatedIds } = await emits("translation.updated", () =>
          updateTranslationsWorkflow(container).run({
            input: { translations: [{ id: translationId, translations: { title: "Updated" } }] },
          }),
        );

        await expectMapped(updatedIds, translationId, false);

        const { ids: deletedIds } = await emits("translation.deleted", () =>
          deleteTranslationsWorkflow(container).run({ input: { ids: [translationId] } }),
        );

        // The row is soft-deleted: only `withDeleted` finds it, which the handler relies on.
        await expectMapped(deletedIds, translationId, true);

        // Without `withDeleted`, a deleted translation can no longer be mapped: the handler needs it.
        const { data: gone } = await query.graph({
          entity: "translations",
          fields: ["id"],
          filters: { id: [translationId] },
        });

        expect(gone).toHaveLength(0);
      });
    });
  },
});
