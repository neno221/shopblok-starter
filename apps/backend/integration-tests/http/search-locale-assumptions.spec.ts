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
import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
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
// accept only those, so the spec reads its locales from the starter's lists: editing
// `src/config/markets.ts` must not break it. `en-US`, the first, is the language the data is in.
const [DEFAULT_LOCALE] = SUPPORTED_LOCALES;
const [TRANSLATED_LOCALE] = TRANSLATED_LOCALES;

// Medusa's event bus has no "idle" signal. After a product is searchable, its other index handler
// (`product-variant.created`) is still running; this is how long the spec lets it finish, so it
// does not write into the next test's restored database. The ADR measured 150 to 270 ms a handler.
const INDEX_HANDLER_GRACE_MS = 1_000;

async function until<T>(
  check: () => Promise<T | undefined | false>,
  what: string,
  timeoutMs = 15_000,
) {
  const start = Date.now();

  while (true) {
    const value = await check();

    if (value !== undefined && value !== false) {
      return value as T;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("ADR 0002: what the per-locale search design rests on", () => {
      let headers: Record<string, string>;
      let salesChannelId: string;
      let shippingProfileId: string;
      const unsubscribers: (() => void)[] = [];

      const search = async (body: object, extraHeaders: Record<string, string> = {}, path = "") =>
        api.post(`/store/search${path}`, body, {
          headers: { ...headers, ...extraHeaders },
          validateStatus: () => true,
        });

      // The hits of a `q` search. A status other than 200 (a wrong key, a missing index) fails at
      // once with the body, instead of reading as "no hits" until `until` times out.
      const hits = async (q: string, extraHeaders: Record<string, string> = {}, path = "") => {
        const response = await search({ entity: "product", filters: { q } }, extraHeaders, path);

        if (response.status !== 200) {
          throw new Error(
            `/store/search answered ${response.status}: ${JSON.stringify(response.data)}`,
          );
        }

        return response.data.results[0].hits as {
          document: { id: string; title: string };
        }[];
      };

      const titles = async (q: string, extraHeaders: Record<string, string> = {}, path = "") =>
        (await hits(q, extraHeaders, path)).map((hit) => hit.document.title);

      // Returns once the product is searchable and its index handlers are done (see
      // INDEX_HANDLER_GRACE_MS), so no handler outlives the test that started it.
      const createProduct = async (handle: string, title: string, categoryIds: string[] = []) => {
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

        const id = result[0]!.id;

        await until(async () => {
          const found = await hits(title);

          return found.some((hit) => hit.document.id === id) ? true : undefined;
        }, `${title} to be indexed`);
        await new Promise((resolve) => setTimeout(resolve, INDEX_HANDLER_GRACE_MS));

        return id;
      };

      beforeAll(async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);

        // The default shipping profile comes from a migration script the runner does not run.
        await createShippingProfilesWorkflow(container).run({
          input: {
            data: [{ name: "Default Shipping Profile", type: "default" }],
          },
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

      afterEach(() => {
        while (unsubscribers.length) {
          unsubscribers.pop()!();
        }
      });

      it("search-postgres rejects search_options.locales, so a storefront cannot pass the locale to it", async () => {
        const response = await search({
          entity: "product",
          filters: { q: "shirt" },
          search_options: { locales: ["el-GR"] },
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
                translations: { title: "Leinenhemd" },
              },
            ],
            update: [],
            delete: [],
          },
        });

        // Index the product again now that it has a translation: the index still holds English only.
        await container.resolve(Modules.SEARCH).ingest({ name: "product.updated", data: [{ id }] });

        for (const locale of [TRANSLATED_LOCALE, DEFAULT_LOCALE]) {
          // Neither way of sending the locale changes what the index holds or returns. They are
          // separate requests: Medusa reads `?locale=` first, so with both only it would be tested.
          const requests: { headers: Record<string, string>; path: string }[] = [
            { headers: { "x-medusa-locale": locale }, path: "" },
            { headers: {}, path: `?locale=${locale}` },
          ];

          for (const { headers: localeHeaders, path } of requests) {
            expect(await titles("Leinenhemd", localeHeaders, path)).toEqual([]);
            expect(await titles("Linen", localeHeaders, path)).toEqual(["Linen shirt"]);
          }
        }
      });

      it("search-postgres folds Greek accents and capitals, and lowercases Cyrillic, with its default text-search configuration", async () => {
        await createProduct("greek-shirt", "Λινό πουκάμισο");
        await createProduct("mongolian-shirt", "Маалинган цамц");

        const queries: [string[], string][] = [
          [["πουκαμισο", "ΠΟΥΚΑΜΙΣΟ", "λινο"], "Λινό πουκάμισο"],
          [["Маалинган", "МААЛИНГАН"], "Маалинган цамц"],
        ];

        for (const [spellings, title] of queries) {
          for (const q of spellings) {
            expect(await titles(q)).toEqual([title]);
          }
        }
      });

      it("query.graph translates a nested object only when the object's id is selected", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { result: categories } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [{ name: "Shirts", handle: "shirts", is_active: true }],
          },
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
                translations: { name: "Πουκάμισα" },
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
        expect(await names(["id", "categories.id", "categories.name"])).toEqual(["Πουκάμισα"]);
      });

      it("a translation event carries translation ids, which the translations entity maps back to the translated entity, also after a delete", async () => {
        const container = getContainer();
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const bus = container.resolve(Modules.EVENT_BUS);
        const productId = await createProduct("event-source", "Event source");
        const seen: { name: string; ids: string[] }[] = [];

        for (const name of ["translation.created", "translation.updated", "translation.deleted"]) {
          // The local bus removes a listener only by its `subscriberId`; `afterEach` does it.
          const subscriberId = `s2-assumptions-${name}`;
          const subscriber = async (event: { data: unknown }) => {
            const ids = (Array.isArray(event.data) ? event.data : [event.data]).map(
              (d) => (d as { id: string }).id,
            );

            seen.push({ name, ids });
          };

          bus.subscribe(name, subscriber, { subscriberId });
          unsubscribers.push(() => bus.unsubscribe(name, subscriber, { subscriberId }));
        }

        // One step at a time, like the index handler: when an event arrives, the translations
        // entity maps its ids to the translated entity.
        const expectEvent = async (name: string, withDeleted: boolean, translationId: string) => {
          const emitted = () => seen.find((s) => s.name === name && s.ids.includes(translationId));
          const event = await until(async () => emitted(), `${name} to be emitted`);

          expect(event.ids).toEqual([translationId]);

          const { data } = await query.graph({
            entity: "translations",
            fields: ["id", "reference", "reference_id", "locale_code"],
            filters: { id: event.ids },
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

        const { result: created } = await batchTranslationsWorkflow(container).run({
          input: {
            create: [
              {
                reference: "product",
                reference_id: productId,
                locale_code: TRANSLATED_LOCALE,
                translations: { title: "Source d'événement" },
              },
            ],
            update: [],
            delete: [],
          },
        });

        expect(created.created).toHaveLength(1);

        const [row] = created.created;

        await expectEvent("translation.created", false, row!.id);

        // The by-id form is what the admin and the batch workflow use. The `selector` form (the
        // second example in the workflow's own docs) throws in 2.21.2, so it emits nothing.
        await updateTranslationsWorkflow(container).run({
          input: {
            translations: [{ id: row!.id, translations: { title: "Source" } }],
          },
        });
        await expectEvent("translation.updated", false, row!.id);

        await deleteTranslationsWorkflow(container).run({
          input: { ids: [row!.id] },
        });
        // The row is soft-deleted: only `withDeleted` finds it, which the handler relies on.
        await expectEvent("translation.deleted", true, row!.id);

        // Without `withDeleted`, a deleted translation can no longer be mapped: the handler needs it.
        const { data: gone } = await query.graph({
          entity: "translations",
          fields: ["id"],
          filters: { id: [row!.id] },
        });

        expect(gone).toHaveLength(0);
      });
    });
  },
});
