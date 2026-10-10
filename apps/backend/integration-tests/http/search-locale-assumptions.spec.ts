/**
 * ADR 0002 (S2): the facts about Medusa 2.21.2's Search and Translation Modules that the
 * per-locale search design rests on, checked on the stock configuration: `search-postgres` and
 * the `product` index, no prototype code. Each test names the sentence of the ADR it guards. If
 * one fails after a Medusa upgrade, read ADR 0002 again before changing the test: the design may
 * be simpler (Medusa gained locale support) or broken (an event or an option changed).
 *
 * Run (the compose stack up, from the repo root):
 *
 *   DB_HOST=localhost DB_PORT=15432 DB_USERNAME=postgres DB_PASSWORD=postgres \
 *     pnpm --filter @shopblok/backend test:integration:http search-locale-assumptions
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

import seedMarkets from "../../src/scripts/seed-markets";

// `apps/backend/.env` points REDIS_URL at the dev stack, whose queues a running dev server shares.
// A blank value (dotenv does not override it) keeps the event bus in memory and the run hermetic.
process.env.REDIS_URL = "";

jest.setTimeout(180_000);

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

      const search = async (body: object, extraHeaders: Record<string, string> = {}, path = "") =>
        api.post(`/store/search${path}`, body, {
          headers: { ...headers, ...extraHeaders },
          validateStatus: () => true,
        });

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
                locale_code: "de-DE",
                translations: { title: "Leinenhemd" },
              },
            ],
            update: [],
            delete: [],
          },
        });

        // Wait for the event handlers to index the product (the default language).
        await until(async () => {
          const response = await search({ entity: "product", filters: { q: "Linen" } });

          return response.data.results?.[0]?.hits?.length ? true : undefined;
        }, "the product index to hold the Linen shirt");
        await container.resolve(Modules.SEARCH).ingest({ name: "product.updated", data: [{ id }] });

        for (const locale of ["de-DE", "en-US"]) {
          // Neither the header nor the query parameter changes what the index holds or returns.
          const german = await search(
            { entity: "product", filters: { q: "Leinenhemd" } },
            { "x-medusa-locale": locale },
            `?locale=${locale}`,
          );
          const english = await search(
            { entity: "product", filters: { q: "Linen" } },
            { "x-medusa-locale": locale },
            `?locale=${locale}`,
          );

          expect(german.data.results[0].hits).toHaveLength(0);
          expect(english.data.results[0].hits).toHaveLength(1);
          expect(english.data.results[0].hits[0].document.title).toBe("Linen shirt");
        }
      });

      it("search-postgres folds Greek accents and capitals, and lowercases Cyrillic, with its default text-search configuration", async () => {
        await createProduct("greek-shirt", "Λινό πουκάμισο");
        await createProduct("mongolian-shirt", "Маалинган цамц");

        for (const q of ["πουκαμισο", "ΠΟΥΚΑΜΙΣΟ", "λινο"]) {
          const hits = await until(async () => {
            const response = await search({ entity: "product", filters: { q } });
            const found = response.data.results?.[0]?.hits ?? [];

            return found.length ? found : undefined;
          }, `a hit for ${q}`);

          expect(hits.map((h: { document: { title: string } }) => h.document.title)).toEqual([
            "Λινό πουκάμισο",
          ]);
        }

        for (const q of ["Маалинган", "МААЛИНГАН"]) {
          const hits = await until(async () => {
            const response = await search({ entity: "product", filters: { q } });
            const found = response.data.results?.[0]?.hits ?? [];

            return found.length ? found : undefined;
          }, `a hit for ${q}`);

          expect(hits.map((h: { document: { title: string } }) => h.document.title)).toEqual([
            "Маалинган цамц",
          ]);
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
                locale_code: "el-GR",
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
            { locale: "el-GR" },
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
        const service = container.resolve(Modules.TRANSLATION);
        const productId = await createProduct("event-source", "Event source");
        const seen: { name: string; ids: string[] }[] = [];

        for (const name of ["translation.created", "translation.updated", "translation.deleted"]) {
          bus.subscribe(name, async (event: { data: unknown }) => {
            const ids = (Array.isArray(event.data) ? event.data : [event.data]).map(
              (d) => (d as { id: string }).id,
            );

            seen.push({ name, ids });
          });
        }

        // One step at a time, like the index handler: when an event arrives, the translations
        // entity maps its ids to the translated entity.
        const expectEvent = async (name: string, withDeleted: boolean, translationId: string) => {
          await until(
            async () => (seen.some((s) => s.name === name) ? true : undefined),
            `${name} to be emitted`,
          );

          const event = seen.find((s) => s.name === name)!;

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
              locale_code: "fr-FR",
            },
          ]);
        };

        const { result: created } = await batchTranslationsWorkflow(container).run({
          input: {
            create: [
              {
                reference: "product",
                reference_id: productId,
                locale_code: "fr-FR",
                translations: { title: "Source d'événement" },
              },
            ],
            update: [],
            delete: [],
          },
        });
        const [row] = await service.listTranslations({
          reference_id: productId,
          locale_code: "fr-FR",
        });

        expect(created).toBeDefined();
        await expectEvent("translation.created", false, row!.id);

        // The by-id form is what the admin and the batch workflow use. The `selector` form that the
        // workflow's own docs show first throws in 2.21.2, so it emits nothing.
        await updateTranslationsWorkflow(container).run({
          input: { translations: [{ id: row!.id, translations: { title: "Source" } }] },
        });
        await expectEvent("translation.updated", false, row!.id);

        await deleteTranslationsWorkflow(container).run({ input: { ids: [row!.id] } });
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
