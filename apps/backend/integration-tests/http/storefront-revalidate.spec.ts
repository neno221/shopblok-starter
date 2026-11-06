/**
 * T78 (D112): Medusa 2.22's price-list events reach the storefront's `/api/revalidate` through the
 * revalidation subscriber, against a fake storefront that records every POST. Adding a price to a
 * list, removing it, and creating, publishing or deleting a list with prices each expire the
 * product's `product:<handle>` at once (`expire: 0`), with `medusa:products` and `search`
 * stale-while-revalidate. SETUP.md, "Leftovers from M4 (T78)", gives the mutation that fails it.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http storefront-revalidate.spec
 */
import { createServer, type Server } from "node:http";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, PriceListStatus } from "@medusajs/framework/utils";
import {
  batchPriceListPricesWorkflow,
  createPriceListsWorkflow,
  deletePriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";

import {
  createCategory,
  createCollection,
  createProduct,
  seedStore,
  until,
  LINEN_SHIRT,
  SHIRTS_CATEGORY,
} from "./search-locale.fixtures";

jest.setTimeout(180_000);

// The config reads these when the app loads, before any test: a fixed port for the fake.
const PORT = 39872;
const SECRET = "test-revalidate-secret";
process.env.STOREFRONT_URL = `http://127.0.0.1:${PORT}`;
process.env.REVALIDATE_SECRET = SECRET;

type Batch = { tags: string[]; expire: 0 | "max" };

/** The storefront's `/api/revalidate` as far as the subscriber uses it. */
class FakeStorefront {
  posts: { auth: string | undefined; batch: Batch }[] = [];
  private server: Server | undefined;

  async start() {
    this.server = createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        if (req.method === "POST" && req.url === "/api/revalidate") {
          this.posts.push({
            auth: req.headers.authorization,
            batch: JSON.parse(body) as Batch,
          });
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end("{}");
      });
    });
    await new Promise<void>((resolve) => this.server!.listen(PORT, "127.0.0.1", resolve));
  }

  stop() {
    return new Promise<void>((resolve) =>
      this.server ? this.server.close(() => resolve()) : resolve(),
    );
  }

  /** Waits for a POST, after the `from`th, that matches; returns it with the time it took. */
  waitFor(from: number, what: string, match: (batch: Batch) => boolean) {
    return until(async () => this.posts.slice(from).find(({ batch }) => match(batch)), {
      what,
      timeoutMs: 15_000,
    });
  }
}

const fake = new FakeStorefront();
beforeAll(() => fake.start());
afterAll(() => fake.stop());

const HANDLE = "sale-linen-shirt";
const expiresProduct = (batch: Batch) =>
  batch.expire === 0 && batch.tags.length === 1 && batch.tags[0] === `product:${HANDLE}`;
const refreshesList = (batch: Batch) =>
  batch.expire === "max" &&
  batch.tags.includes("medusa:products") &&
  batch.tags.includes("search") &&
  !batch.tags.some((tag) => tag.startsWith("product:"));

/** A published product with two variants, and the first variant's id. */
async function productWithVariant(container: MedusaContainer) {
  const seeded = await seedStore(container);
  const categoryId = await createCategory(container, SHIRTS_CATEGORY, "sale-shirts");
  const collectionId = await createCollection(container, "Sale");
  const productId = await createProduct(container, seeded, {
    handle: HANDLE,
    text: LINEN_SHIRT,
    categoryId,
    collectionId,
  });
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id"],
    filters: { product_id: productId },
  });
  return data[0]!.id as string;
}

const SALE = { amount: 39, currency_code: "eur" };

medusaIntegrationTestRunner({
  testSuite: ({ getContainer }) => {
    describe("T78: price-list events expire the products' tags (D112)", () => {
      it("adding a price to a list, then removing it, expires the product at once", async () => {
        const container = getContainer();
        const variantId = await productWithVariant(container);
        const { result: lists } = await createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              {
                title: "Summer sale",
                description: "Linen for less",
                type: "sale",
                status: PriceListStatus.ACTIVE,
              },
            ],
          },
        });
        const listId = lists[0]!.id;

        // prices_added carries { id, price_set_ids }: the set leads to the variant's product.
        let from = fake.posts.length;
        const { result: added } = await batchPriceListPricesWorkflow(container).run({
          input: {
            data: {
              id: listId,
              create: [{ ...SALE, variant_id: variantId }],
              update: [],
              delete: [],
            },
          },
        });
        const addedPost = await fake.waitFor(
          from,
          "the product's tag after prices_added",
          expiresProduct,
        );
        expect(addedPost.value.auth).toBe(`Bearer ${SECRET}`);
        await fake.waitFor(from, "the list tags after prices_added", refreshesList);
        console.log(`T78: prices_added expired product:${HANDLE} in ${addedPost.elapsedMs} ms`);

        // prices_updated: the same set, read the same way.
        const priceId = added.created[0]!.id;
        from = fake.posts.length;
        await batchPriceListPricesWorkflow(container).run({
          input: {
            data: {
              id: listId,
              create: [],
              update: [
                {
                  id: priceId,
                  amount: 35,
                  currency_code: "eur",
                  variant_id: variantId,
                },
              ],
              delete: [],
            },
          },
        });
        await fake.waitFor(from, "the product's tag after prices_updated", expiresProduct);

        // prices_removed: the price is gone, but its set still links the variant.
        from = fake.posts.length;
        await batchPriceListPricesWorkflow(container).run({
          input: {
            data: { id: listId, create: [], update: [], delete: [priceId] },
          },
        });
        const removedPost = await fake.waitFor(
          from,
          "the product's tag after prices_removed",
          expiresProduct,
        );
        console.log(`T78: prices_removed expired product:${HANDLE} in ${removedPost.elapsedMs} ms`);
      });

      it("creating, publishing and deleting a list with prices expires the product at once", async () => {
        const container = getContainer();
        const variantId = await productWithVariant(container);

        // created carries only { id }: the list's prices name the sets.
        let from = fake.posts.length;
        const { result: lists } = await createPriceListsWorkflow(container).run({
          input: {
            price_lists_data: [
              {
                title: "Winter sale",
                description: "Draft first",
                type: "sale",
                status: PriceListStatus.DRAFT,
                prices: [{ ...SALE, variant_id: variantId }],
              },
            ],
          },
        });
        const listId = lists[0]!.id;
        await fake.waitFor(from, "the product's tag after created", expiresProduct);

        // updated (the draft goes live): the same read.
        from = fake.posts.length;
        await updatePriceListsWorkflow(container).run({
          input: {
            price_lists_data: [{ id: listId, status: PriceListStatus.ACTIVE }],
          },
        });
        await fake.waitFor(from, "the product's tag after updated", expiresProduct);

        // deleted: emitted after the list and its prices are soft-deleted. medusa:products and
        // search always go; the soft-deleted prices still name the product.
        from = fake.posts.length;
        await deletePriceListsWorkflow(container).run({
          input: { ids: [listId] },
        });
        await fake.waitFor(from, "medusa:products after deleted", refreshesList);
        const deletedPost = await fake.waitFor(
          from,
          "the product's tag after deleted",
          expiresProduct,
        );
        console.log(`T78: deleted expired product:${HANDLE} in ${deletedPost.elapsedMs} ms`);
      });
    });
  },
});
