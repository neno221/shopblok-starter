/**
 * T60 (D75, D76): the Medusa → Payload sync against a fake Payload that records every request.
 * The events reach Payload through the subscriber, a category's parent arrives as a Payload id,
 * a deleted record is marked and not removed, the workflow's compensation puts a document back
 * when its second write fails, the bulk route answers an admin only, and whether adding a store
 * locale delivers `store.store-locale.created` to a subscriber. SETUP.md, "The Medusa → Payload
 * sync (T60)", lists a mutation that fails each test.
 *
 * Run (the compose stack up, from the repo root):
 *
 *   pnpm --filter @shopblok/backend test:integration:http payload-sync.spec
 */
import { createServer, type IncomingMessage, type Server } from "node:http";

import { medusaIntegrationTestRunner } from "@medusajs/test-utils";
import { ContainerRegistrationKeys, generateJwtToken, Modules } from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createProductCategoriesWorkflow,
  deleteProductsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows";
import type { MedusaContainer } from "@medusajs/framework/types";

import seedMarkets from "../../src/scripts/seed-markets";
import { syncPayloadDocumentWorkflow } from "../../src/workflows/sync-to-payload";
import {
  addStoreLocales,
  createCollection,
  createProduct,
  createCategory,
  seedStore,
  until,
  LINEN_SHIRT,
  SHIRTS_CATEGORY,
} from "./search-locale.fixtures";

jest.setTimeout(180_000);

// The module reads these when the app loads, before any test: a fixed port for the fake.
const PORT = 39871;
const API_KEY = "test-sync-key";
process.env.PAYLOAD_SERVER_URL = `http://127.0.0.1:${PORT}`;
process.env.PAYLOAD_API_KEY = API_KEY;

type Doc = Record<string, unknown> & { id: number };
type Recorded = { method: string; path: string; auth: string | undefined; body: unknown };

/**
 * Payload's REST API as far as the sync uses it: find by `medusaId` (or a page of everything),
 * create, update, delete, and the `markets` global. `failWhen` makes a request answer 500.
 */
class FakePayload {
  collections: Record<string, Doc[]> = { products: [], categories: [], collections: [] };
  markets: Record<string, unknown> = { synced: {} };
  requests: Recorded[] = [];
  failWhen: ((request: Recorded) => boolean) | undefined;
  private next = 1;
  private server: Server | undefined;

  find(collection: string, medusaId: string): Doc | undefined {
    return this.collections[collection]?.find((doc) => doc.medusaId === medusaId);
  }

  async start() {
    this.server = createServer((req, res) => {
      void this.handle(req).then(
        ({ status, body }) => {
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(body));
        },
        (error: Error) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ errors: [{ message: error.message }] }));
        },
      );
    });
    await new Promise<void>((resolve) => this.server!.listen(PORT, "127.0.0.1", resolve));
  }

  async stop() {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private async handle(req: IncomingMessage): Promise<{ status: number; body: unknown }> {
    const url = new URL(req.url ?? "/", "http://fake");
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw === "" ? undefined : (JSON.parse(raw) as Record<string, unknown>);
    const recorded: Recorded = {
      method: req.method ?? "GET",
      path: url.pathname,
      auth: req.headers.authorization,
      body,
    };
    this.requests.push(recorded);
    if (req.headers.authorization !== `integrations API-Key ${API_KEY}`) {
      return { status: 401, body: { errors: [{ message: "Unauthorized" }] } };
    }
    if (this.failWhen?.(recorded)) {
      return { status: 500, body: { errors: [{ message: "fake failure" }] } };
    }

    if (url.pathname === "/api/globals/markets") {
      if (req.method === "GET") return { status: 200, body: this.markets };
      this.markets = { ...this.markets, ...body };
      return { status: 200, body: { result: this.markets } };
    }
    const [, , collection, id] = url.pathname.split("/");
    const docs = this.collections[collection!];
    if (docs === undefined) return { status: 404, body: { errors: [{ message: "No such" }] } };
    const doc =
      id === undefined ? undefined : docs.find((candidate) => String(candidate.id) === id);

    if (req.method === "GET") {
      const medusaId = url.searchParams.get("where[medusaId][equals]");
      const found = medusaId === null ? docs : docs.filter((d) => d.medusaId === medusaId);
      return { status: 200, body: { docs: found, hasNextPage: false, totalDocs: found.length } };
    }
    if (req.method === "POST") {
      const created = { ...body, id: this.next++ } as Doc;
      docs.push(created);
      return { status: 201, body: { doc: created } };
    }
    if (doc === undefined) return { status: 404, body: { errors: [{ message: "Not found" }] } };
    if (req.method === "PATCH") {
      Object.assign(doc, body);
      return { status: 200, body: { doc } };
    }
    if (req.method === "DELETE") {
      docs.splice(docs.indexOf(doc), 1);
      return { status: 200, body: { doc } };
    }
    return { status: 405, body: { errors: [{ message: "Method not allowed" }] } };
  }
}

const fake = new FakePayload();

/** A signed-in admin's token, the way the dashboard's session would carry one. */
async function adminToken(container: MedusaContainer): Promise<string> {
  const users = container.resolve(Modules.USER);
  const auth = container.resolve(Modules.AUTH);
  const user = await users.createUsers({ email: `admin-${Date.now()}@example.com` });
  const identity = await auth.createAuthIdentities({
    provider_identities: [{ provider: "emailpass", entity_id: user.email }],
    app_metadata: { user_id: user.id },
  });
  const { http } = container.resolve(ContainerRegistrationKeys.CONFIG_MODULE).projectConfig;
  return generateJwtToken(
    { actor_id: user.id, actor_type: "user", auth_identity_id: identity.id, app_metadata: {} },
    { secret: http.jwtSecret, expiresIn: "1h" },
  );
}

beforeAll(() => fake.start());
afterAll(() => fake.stop());

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("T60: the Medusa → Payload sync", () => {
      beforeEach(() => {
        fake.failWhen = undefined;
      });

      it("writes a new product, category and collection with the key, and a parent as an id", async () => {
        const container = getContainer();
        const seeded = await seedStore(container);
        const parentId = await createCategory(container, SHIRTS_CATEGORY, "sync-tops");
        const { result } = await createProductCategoriesWorkflow(container).run({
          input: {
            product_categories: [
              {
                name: "Linen",
                handle: "sync-linen",
                parent_category_id: parentId,
                is_active: true,
              },
            ],
          },
        });
        const childId = result[0]!.id;
        const collectionId = await createCollection(container, "SyncSummer");
        const productId = await createProduct(container, seeded, {
          handle: "sync-linen-shirt",
          text: LINEN_SHIRT,
          categoryId: childId,
          collectionId,
        });

        const { value: child } = await until(
          async () => {
            const doc = fake.find("categories", childId);
            return doc?.parent !== undefined && doc.parent !== null ? doc : undefined;
          },
          { what: "the child category with its parent" },
        );
        const parent = fake.find("categories", parentId)!;
        expect(child).toMatchObject({ handle: "sync-linen", title: "Linen", parent: parent.id });
        const { value: product } = await until(async () => fake.find("products", productId), {
          what: "the product",
        });
        expect(product).toMatchObject({
          handle: "sync-linen-shirt",
          title: LINEN_SHIRT["en-US"].title,
          deletedInMedusa: false,
        });
        expect(typeof product.syncedAt).toBe("string");
        await until(async () => fake.find("collections", collectionId), { what: "the collection" });

        // Every request signed in as the integration; no query-string flag anywhere.
        expect(fake.requests.length).toBeGreaterThan(0);
        for (const request of fake.requests) {
          expect(request.auth).toBe(`integrations API-Key ${API_KEY}`);
          expect(request.path).not.toContain("is_from_medusa");
        }
      });

      it("marks a deleted product, and keeps the document", async () => {
        const container = getContainer();
        const seeded = await seedStore(container);
        const categoryId = await createCategory(container, SHIRTS_CATEGORY, "sync-deleted-cat");
        const collectionId = await createCollection(container, "SyncDeleted");
        const productId = await createProduct(container, seeded, {
          handle: "sync-deleted",
          text: LINEN_SHIRT,
          categoryId,
          collectionId,
        });
        await until(async () => fake.find("products", productId), { what: "the product" });
        await deleteProductsWorkflow(container).run({ input: { ids: [productId] } });
        await until(async () => fake.find("products", productId)?.deletedInMedusa === true, {
          what: "the product marked deleted",
        });
        expect(fake.find("products", productId)).toMatchObject({ handle: "sync-deleted" });
      });

      it("puts the previous document back when the second write fails (compensation)", async () => {
        const container = getContainer();
        await seedStore(container);
        const parentId = await createCategory(container, SHIRTS_CATEGORY, "sync-comp-parent");
        const { result } = await createProductCategoriesWorkflow(container).run({
          input: { product_categories: [{ name: "Before", handle: "sync-comp", is_active: true }] },
        });
        const id = result[0]!.id;
        const before = await until(
          async () => {
            const doc = fake.find("categories", id);
            return doc?.title === "Before" ? { ...doc } : undefined;
          },
          { what: "the category" },
        );

        // The rename arrives, and linking its new parent (the second write) fails.
        fake.failWhen = (request) =>
          request.method === "PATCH" &&
          typeof request.body === "object" &&
          request.body !== null &&
          "parent" in request.body &&
          !("title" in request.body);
        await expect(
          syncPayloadDocumentWorkflow(container).run({
            input: {
              collection: "categories",
              document: {
                fields: {
                  medusaId: id,
                  title: "After",
                  handle: "sync-comp-renamed",
                  rank: 0,
                  deletedInMedusa: false,
                  medusaUpdatedAt: new Date().toISOString(),
                },
                references: { parent: parentId },
              },
            },
          }),
        ).rejects.toMatchObject({ message: expect.stringContaining("fake failure") });
        fake.failWhen = undefined;
        const after = fake.find("categories", id)!;
        expect(after).toMatchObject({
          title: before.value.title,
          handle: before.value.handle,
          medusaUpdatedAt: before.value.medusaUpdatedAt,
        });

        // A document the failed run created is removed again.
        fake.failWhen = (request) => request.method === "PATCH";
        await expect(
          syncPayloadDocumentWorkflow(container).run({
            input: {
              collection: "categories",
              document: {
                fields: {
                  medusaId: "pcat_never",
                  title: "Never",
                  handle: "never",
                  rank: 0,
                  deletedInMedusa: false,
                  medusaUpdatedAt: new Date().toISOString(),
                },
                references: { parent: parentId },
              },
            },
          }),
        ).rejects.toMatchObject({ message: expect.stringContaining("fake failure") });
        fake.failWhen = undefined;
        expect(fake.find("categories", "pcat_never")).toBeUndefined();
      });

      it("writes markets.synced when a region's countries change", async () => {
        const container = getContainer();
        const seeded = await seedStore(container);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data } = await query.graph({
          entity: "region",
          fields: ["countries.iso_2"],
          filters: { id: seeded.regionId },
        });
        const countries = (data[0]!.countries ?? []).flatMap((c) => (c?.iso_2 ? [c.iso_2] : []));
        await updateRegionsWorkflow(container).run({
          input: {
            selector: { id: seeded.regionId },
            update: { countries: [...countries, "at"] },
          },
        });
        await until(
          async () => {
            const synced = fake.markets.synced as {
              regions?: { medusaId: string; countries: string[] }[];
            };
            return synced.regions
              ?.find((region) => region.medusaId === seeded.regionId)
              ?.countries.includes("at");
          },
          { what: "Austria in markets.synced" },
        );
      });

      it("answers the bulk route for an admin's token only, not a secret key or nobody", async () => {
        const container = getContainer();
        const anyStatus = { validateStatus: () => true };
        expect((await api.post("/admin/payload/sync", {}, anyStatus)).status).toBe(401);

        const { result } = await createApiKeysWorkflow(container).run({
          input: { api_keys: [{ title: "sync-test", type: "secret", created_by: "" }] },
        });
        const basic = Buffer.from(`${result[0]!.token}:`).toString("base64");
        const withKey = await api.post(
          "/admin/payload/sync",
          {},
          { headers: { authorization: `Basic ${basic}` }, ...anyStatus },
        );
        expect(withKey.status).toBe(401);

        const token = await adminToken(container);
        const response = await api.post(
          "/admin/payload/sync",
          {},
          { headers: { authorization: `Bearer ${token}` } },
        );
        expect(response.status).toBe(200);
        expect(response.data.run).toMatchObject({ kind: "bulk", markets: "updated" });
        const last = await api.get("/admin/payload/sync", {
          headers: { authorization: `Bearer ${token}` },
        });
        expect(last.data).toMatchObject({ configured: true, last_run: { kind: "bulk" } });
      });

      it("syncs a new store locale (store.store-locale.created), and the markets seed keeps it", async () => {
        const container = getContainer();
        await seedStore(container);
        const bus = container.resolve(Modules.EVENT_BUS);
        const seen: string[] = [];
        for (const name of [
          "store.store-locale.created",
          "store-locale.created",
          "store.updated",
        ]) {
          bus.subscribe(name, async () => {
            seen.push(name);
          });
        }
        await addStoreLocales(container, ["it-IT"]);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
        // Recorded in SETUP.md, "The Medusa → Payload sync (T60)": the store module's own event
        // arrives, once per locale the store then has (its update replaces every row); there is
        // no `store.updated` and no unprefixed name.
        expect(new Set(seen)).toEqual(new Set(["store.store-locale.created"]));
        await until(
          async () =>
            ((fake.markets.synced as { locales?: string[] }).locales ?? []).includes("it-IT"),
          { what: "it-IT in markets.synced" },
        );

        // D76: the markets seed (a second `pnpm bootstrap`) adds locales and keeps this one.
        await seedMarkets({ container, args: [] } as never);
        const query = container.resolve(ContainerRegistrationKeys.QUERY);
        const { data: stores } = await query.graph({
          entity: "store",
          fields: ["supported_locales.locale_code"],
        });
        expect((stores[0]!.supported_locales ?? []).map((locale) => locale?.locale_code)).toContain(
          "it-IT",
        );
      });
    });
  },
});
