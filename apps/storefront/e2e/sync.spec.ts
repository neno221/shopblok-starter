import { expect, test } from "@playwright/test";
import { adminCredentials } from "./support/admin-credentials";
import { appEnv } from "./support/app-env";
import { medusaAdminApi, medusaAdminToken, medusaUrl } from "./support/medusa-admin";

// T60 (D75, D76): the Medusa → Payload sync between the running servers. A change made through
// Medusa's Admin API shows in Payload within 10 s; a deleted product is marked, not removed; and
// who may write what: an editor cannot change a synced field or create a synced document. (The
// markets are not synced any more: the storefront reads Medusa's map itself, M4b D94, and
// markets-add.spec.ts and payload-locales.spec.ts cover that side.)

test.describe.configure({ mode: "serial" });
test.setTimeout(60_000);

const stamp = Date.now();
const SYNC_TIMEOUT = 10_000;

let base = "";
let medusa = "";
let medusaToken = "";
let payloadToken = "";
let editorToken = "";
let editorId: number | undefined;
const integration = () => `integrations API-Key ${appEnv("backend", "PAYLOAD_API_KEY")}`;

const medusaApi = (method: string, path: string, body?: unknown) =>
  medusaAdminApi(medusa, medusaToken, method, path, body);

/** Payload's REST API, as a staff member (`JWT …`) or the integration. */
const payloadApi = (method: string, path: string, authorization: string, body?: unknown) =>
  fetch(`${base}/api${path}`, {
    method,
    headers: { authorization, origin: base, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

type Synced = { medusaId: string; title: string; handle: string; deletedInMedusa: boolean };

/** The synced document of a Medusa id, read as a visitor (the collections are public). */
async function synced(collection: string, medusaId: string): Promise<Record<string, unknown>> {
  const response = await fetch(
    `${base}/api/${collection}?where[medusaId][equals]=${medusaId}&depth=0`,
  );
  const { docs } = (await response.json()) as { docs: Record<string, unknown>[] };
  return docs[0] ?? {};
}

const created: { products: string[]; categories: string[] } = { products: [], categories: [] };

test.beforeAll(async ({ baseURL }) => {
  base = new URL(baseURL ?? "http://localhost:8000").origin;
  medusa = medusaUrl();
  const { email, password } = adminCredentials();

  medusaToken = await medusaAdminToken(medusa);

  const payloadLogin = await payloadApi("POST", "/users/login", "", { email, password });
  payloadToken = ((await payloadLogin.json()) as { token: string }).token;

  // An editor of our own, removed again in afterAll.
  const editorEmail = `sync-editor-${stamp}@example.com`;
  const editorPassword = `editor-${stamp}-password`;
  const editor = await payloadApi("POST", "/users", `JWT ${payloadToken}`, {
    email: editorEmail,
    password: editorPassword,
    role: "editor",
  });
  expect(editor.status, await editor.clone().text()).toBe(201);
  editorId = ((await editor.json()) as { doc: { id: number } }).doc.id;
  const editorLogin = await payloadApi("POST", "/users/login", "", {
    email: editorEmail,
    password: editorPassword,
  });
  editorToken = ((await editorLogin.json()) as { token: string }).token;
});

test.afterAll(async () => {
  for (const id of created.products) {
    await medusaApi("DELETE", `/admin/products/${id}`).catch(() => undefined);
  }
  for (const id of [...created.categories].reverse()) {
    await medusaApi("DELETE", `/admin/product-categories/${id}`).catch(() => undefined);
  }
  // Only the integration removes a synced document; these were the test's own. Each is marked
  // first (the deletes above reach Payload through the sync), so no sync write is still on its way,
  // and a child goes before its parent.
  for (const [collection, ids] of Object.entries(created)) {
    for (const medusaId of [...ids].reverse()) {
      await expect
        .poll(async () => (await synced(collection, medusaId))["deletedInMedusa"] ?? true, {
          timeout: SYNC_TIMEOUT,
        })
        .toBe(true)
        .catch(() => undefined);
      const doc = await synced(collection, medusaId);
      if (doc["id"] !== undefined) {
        await payloadApi("DELETE", `/${collection}/${String(doc["id"])}`, integration());
      }
    }
  }
  if (editorId !== undefined) {
    await payloadApi("DELETE", `/users/${editorId}`, `JWT ${payloadToken}`);
  }
});

test("a product renamed in Medusa shows its new title in Payload within 10 s", async () => {
  const { product } = (await medusaApi("POST", "/admin/products", {
    title: `Sync probe ${stamp}`,
    handle: `sync-probe-${stamp}`,
    status: "draft",
    options: [{ title: "Default", values: ["Default"] }],
    variants: [{ title: "Default", options: { Default: "Default" }, prices: [] }],
  })) as { product: { id: string } };
  created.products.push(product.id);
  await expect
    .poll(async () => (await synced("products", product.id))["title"], { timeout: SYNC_TIMEOUT })
    .toBe(`Sync probe ${stamp}`);

  await medusaApi("POST", `/admin/products/${product.id}`, { title: `Sync renamed ${stamp}` });
  await expect
    .poll(async () => (await synced("products", product.id))["title"], { timeout: SYNC_TIMEOUT })
    .toBe(`Sync renamed ${stamp}`);
  expect(await synced("products", product.id)).toMatchObject({
    handle: `sync-probe-${stamp}`,
    deletedInMedusa: false,
  } satisfies Partial<Synced>);
});

test("a new category appears with its parent", async () => {
  const { product_category: parent } = (await medusaApi("POST", "/admin/product-categories", {
    name: `Sync parent ${stamp}`,
    handle: `sync-parent-${stamp}`,
  })) as { product_category: { id: string } };
  created.categories.push(parent.id);
  const { product_category: child } = (await medusaApi("POST", "/admin/product-categories", {
    name: `Sync child ${stamp}`,
    handle: `sync-child-${stamp}`,
    parent_category_id: parent.id,
  })) as { product_category: { id: string } };
  created.categories.push(child.id);

  await expect
    .poll(async () => (await synced("categories", child.id))["parent"] ?? null, {
      timeout: SYNC_TIMEOUT,
    })
    .not.toBeNull();
  const parentDoc = await synced("categories", parent.id);
  expect((await synced("categories", child.id))["parent"]).toBe(parentDoc["id"]);
});

test("a product deleted in Medusa is marked, not removed", async () => {
  const id = created.products[0]!;
  await medusaApi("DELETE", `/admin/products/${id}`);
  await expect
    .poll(async () => (await synced("products", id))["deletedInMedusa"], { timeout: SYNC_TIMEOUT })
    .toBe(true);
  expect((await synced("products", id))["title"]).toBe(`Sync renamed ${stamp}`);
});

test("an editor cannot change a synced field, nor create a synced document", async () => {
  const id = created.categories[0]!;
  const before = await synced("categories", id);
  const write = await payloadApi(
    "PATCH",
    `/categories/${String(before["id"])}`,
    `JWT ${editorToken}`,
    {
      medusaId: "pcat_forged",
      title: "Forged",
    },
  );
  // Payload drops a field the request may not write and saves the rest (none here).
  expect(write.status).toBe(200);
  expect(await synced("categories", id)).toMatchObject({
    medusaId: id,
    title: before["title"],
  });
  const create = await payloadApi("POST", "/products", `JWT ${editorToken}`, {
    medusaId: "prod_forged",
    title: "Forged",
    handle: "forged",
  });
  expect(create.status).toBe(403);
});
